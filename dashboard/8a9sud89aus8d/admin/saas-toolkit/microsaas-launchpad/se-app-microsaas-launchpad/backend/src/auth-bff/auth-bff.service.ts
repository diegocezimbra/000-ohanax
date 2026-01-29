import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../database/entities/admin-user.entity';
import { AdminSession } from '../database/entities/admin-session.entity';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  projectId?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

/**
 * Auth BFF Service
 *
 * Implementa autenticacao segura usando tokens do Auth service.
 * - access_token: retornado para o frontend (armazenado em localStorage)
 * - refresh_token: armazenado no banco de dados (nunca exposto ao frontend)
 *
 * Fluxo:
 * 1. Frontend redireciona para Authify hosted login
 * 2. Authify redireciona para /auth/callback com ?code=xxx
 * 3. Backend troca code por tokens via POST /auth/token
 * 4. Backend salva refresh_token no banco e retorna access_token para frontend
 * 5. Frontend usa access_token em todas requisicoes (Authorization: Bearer xxx)
 * 6. Backend valida access_token chamando Auth /auth/profile
 * 7. Quando access_token expira, backend usa refresh_token do banco para renovar
 */
@Injectable()
export class AuthBffService {
  private readonly logger = new Logger(AuthBffService.name);
  private readonly authServiceUrl: string;
  private readonly authFrontendUrl: string;
  private readonly apiKey: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AdminSession)
    private readonly adminSessionRepository: Repository<AdminSession>,
  ) {
    this.authServiceUrl = this.configService.get<string>('AUTHIFY_URL') || '';
    this.authFrontendUrl = this.configService.get<string>('AUTHIFY_FRONTEND_URL') || '';
    this.apiKey = this.configService.get<string>('AUTHIFY_API_KEY') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';

    if (!this.authServiceUrl) {
      this.logger.warn('AUTHIFY_URL not configured');
    }
    if (!this.authFrontendUrl) {
      this.logger.warn('AUTHIFY_FRONTEND_URL not configured');
    }
    if (!this.apiKey) {
      this.logger.warn('AUTHIFY_API_KEY not configured');
    }
  }

  /**
   * Gera uma URL de login segura chamando o backend do Auth
   * O backend do Auth retorna uma URL com um token temporário (nunca expõe a API key)
   */
  async getLoginUrl(): Promise<string> {
    const callbackUrl = `${this.frontendUrl}/auth/callback`;

    try {
      const response = await fetch(`${this.authServiceUrl}/auth/login-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          redirect_url: callbackUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`Failed to get login URL: ${JSON.stringify(error)}`);
        throw new Error(error.message || 'Failed to generate login URL');
      }

      const data = await response.json();
      return data.loginUrl;
    } catch (error) {
      this.logger.error(`Failed to get login URL: ${error.message}`);
      throw new Error('Failed to generate login URL. Please try again.');
    }
  }

  /**
   * Troca authorization code por tokens
   * Salva refresh_token no banco e retorna access_token
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; user: AuthUser }> {
    try {
      const response = await fetch(`${this.authServiceUrl}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`Token exchange failed: ${JSON.stringify(error)}`);
        throw new UnauthorizedException(error.error_description || 'Token exchange failed');
      }

      const tokenResponse: TokenResponse = await response.json();

      // Sync user to local database
      await this.ensureLocalUser(tokenResponse.user);

      // Save refresh_token in database
      await this.saveSession(
        tokenResponse.user.id,
        tokenResponse.refresh_token,
        ipAddress,
        userAgent,
      );

      return {
        accessToken: tokenResponse.access_token,
        user: tokenResponse.user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Failed to exchange code: ${error.message}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Valida access_token chamando Auth /auth/profile
   */
  async validateAccessToken(accessToken: string): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.authServiceUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          projectId: user.projectId,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to validate access token: ${error.message}`);
      return null;
    }
  }

  /**
   * Renova access_token usando refresh_token do banco
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; user: AuthUser } | null> {
    // Get active session from database
    const session = await this.adminSessionRepository.findOne({
      where: { adminUserId: userId, active: true },
      order: { createdAt: 'DESC' },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.adminSessionRepository.update(session.id, { active: false });
      }
      return null;
    }

    try {
      const response = await fetch(`${this.authServiceUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
        }),
      });

      if (!response.ok) {
        // Refresh token invalid, deactivate session
        await this.adminSessionRepository.update(session.id, { active: false });
        return null;
      }

      const tokenResponse: TokenResponse = await response.json();

      // Update session with new refresh token
      await this.adminSessionRepository.update(session.id, {
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      return {
        accessToken: tokenResponse.access_token,
        user: tokenResponse.user,
      };
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      return null;
    }
  }

  /**
   * Logout - revoga sessao no banco e no Auth
   */
  async logout(userId: string): Promise<void> {
    const session = await this.adminSessionRepository.findOne({
      where: { adminUserId: userId, active: true },
      order: { createdAt: 'DESC' },
    });

    if (session) {
      // Revoke on Auth service
      try {
        await fetch(`${this.authServiceUrl}/auth/token/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: session.refreshToken,
          }),
        });
      } catch (error) {
        this.logger.error(`Failed to revoke token on Auth: ${error.message}`);
      }

      // Deactivate session in database
      await this.adminSessionRepository.update(session.id, { active: false });
    }
  }

  /**
   * Salva sessao no banco de dados
   */
  private async saveSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Deactivate previous sessions for this user
    await this.adminSessionRepository.update(
      { adminUserId: userId, active: true },
      { active: false },
    );

    // Create new session
    const session = this.adminSessionRepository.create({
      adminUserId: userId,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      active: true,
    });

    await this.adminSessionRepository.save(session);
  }

  /**
   * Sincroniza usuario para banco local
   */
  private async ensureLocalUser(authUser: AuthUser): Promise<void> {
    try {
      const existingUser = await this.adminUserRepository.findOne({
        where: { id: authUser.id },
      });

      if (existingUser) {
        await this.adminUserRepository.update(authUser.id, {
          email: authUser.email,
          name: authUser.name || existingUser.name,
          lastLoginAt: new Date(),
        });
      } else {
        const newUser = this.adminUserRepository.create({
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          emailVerified: true,
          provider: 'authify',
          lastLoginAt: new Date(),
        });
        await this.adminUserRepository.save(newUser);
        this.logger.log(`Created local admin user for ${authUser.email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync user to local DB: ${error.message}`);
    }
  }
}
