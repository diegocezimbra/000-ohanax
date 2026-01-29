import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthBffService } from './auth-bff.service';

const COOKIE_NAME = 'app_access_token';
const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutos (mesmo tempo do access token)

/**
 * Auth BFF Controller
 *
 * Endpoints de autenticacao usando httpOnly cookies (mais seguro contra XSS).
 * - access_token: armazenado em httpOnly cookie
 * - refresh_token: armazenado no banco (nunca exposto)
 *
 * Fluxo:
 * 1. GET /api/auth/login → redireciona para Auth hosted login
 * 2. Auth redireciona para frontend /auth/callback?code=xxx
 * 3. Frontend chama POST /api/auth/callback com code
 * 4. Backend seta httpOnly cookie com access_token
 * 5. Frontend usa credentials: 'include' em todas requisicoes
 */
@ApiTags('Auth')
@Controller('api/auth')
export class AuthBffController {
  private readonly frontendUrl: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly authBffService: AuthBffService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Helper para setar o cookie de acesso
   */
  private setAccessTokenCookie(res: Response, accessToken: string): void {
    res.cookie(COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  /**
   * Helper para limpar o cookie de acesso
   */
  private clearAccessTokenCookie(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/',
    });
  }

  /**
   * Helper para extrair token do cookie ou header
   */
  private extractToken(req: Request): string | null {
    // 1. Prioridade: httpOnly cookie
    const cookieToken = req.cookies?.[COOKIE_NAME];
    if (cookieToken) {
      return cookieToken;
    }

    // 2. Fallback: Authorization header
    const authHeader = req.headers.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Redireciona para a pagina de login do Authify
   */
  @Get('login')
  @ApiOperation({ summary: 'Redirect to Authify login' })
  @ApiResponse({ status: 302, description: 'Redirects to Authify hosted login' })
  async login(@Res() res: Response) {
    try {
      const loginUrl = await this.authBffService.getLoginUrl();
      res.redirect(loginUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate login URL';
      res.redirect(`${this.frontendUrl}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  /**
   * Troca authorization code por access_token
   * Frontend chama este endpoint apos receber o code do Auth
   * O access_token é setado em httpOnly cookie para segurança
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange authorization code for access token' })
  @ApiBody({ schema: { type: 'object', properties: { code: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Returns user info (token set in httpOnly cookie)' })
  @ApiResponse({ status: 401, description: 'Invalid code' })
  async callback(
    @Body('code') code: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('Missing authorization code');
    }

    const redirectUri = `${this.frontendUrl}/auth/callback`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { accessToken, user } = await this.authBffService.exchangeCodeForTokens(
      code,
      redirectUri,
      ipAddress,
      userAgent,
    );

    // Setar token em httpOnly cookie
    this.setAccessTokenCookie(res, accessToken);

    return {
      token_type: 'Bearer',
      user,
    };
  }

  /**
   * Retorna informacoes do usuario autenticado
   * Aceita token via cookie httpOnly ou Authorization header
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async me(@Req() req: Request) {
    const accessToken = this.extractToken(req);

    if (!accessToken) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.authBffService.validateAccessToken(accessToken);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { user };
  }

  /**
   * Verifica status de autenticacao e retorna user se valido
   * Aceita token via cookie httpOnly ou Authorization header
   */
  @Get('status')
  @ApiOperation({ summary: 'Check authentication status' })
  @ApiResponse({ status: 200, description: 'Authentication status' })
  async status(@Req() req: Request) {
    const accessToken = this.extractToken(req);

    if (!accessToken) {
      return { authenticated: false };
    }

    const user = await this.authBffService.validateAccessToken(accessToken);

    if (!user) {
      return { authenticated: false };
    }

    return { authenticated: true, user };
  }

  /**
   * Renova access_token usando refresh_token do banco
   * O novo token é setado em httpOnly cookie
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ schema: { type: 'object', properties: { user_id: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'New access token (set in httpOnly cookie)' })
  @ApiResponse({ status: 401, description: 'Session expired' })
  async refresh(
    @Body('user_id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    const result = await this.authBffService.refreshAccessToken(userId);

    if (!result) {
      // Limpar cookie expirado
      this.clearAccessTokenCookie(res);
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    // Setar novo token em httpOnly cookie
    this.setAccessTokenCookie(res, result.accessToken);

    return {
      token_type: 'Bearer',
      user: result.user,
    };
  }

  /**
   * Logout - revoga sessao e limpa cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiBody({ schema: { type: 'object', properties: { user_id: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body('user_id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (userId) {
      await this.authBffService.logout(userId);
    }

    // Limpar cookie de acesso
    this.clearAccessTokenCookie(res);

    return { success: true, message: 'Logged out successfully' };
  }
}
