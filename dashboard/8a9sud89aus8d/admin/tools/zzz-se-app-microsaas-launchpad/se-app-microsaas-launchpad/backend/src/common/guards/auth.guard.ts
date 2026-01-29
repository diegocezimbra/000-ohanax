import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthBffService } from '../../auth-bff/auth-bff.service';

const COOKIE_NAME = 'app_access_token';

/**
 * AuthGuard - Validates tokens for authenticated routes.
 *
 * Aceita tokens de duas formas (em ordem de prioridade):
 * 1. httpOnly cookie 'app_access_token' (mais seguro, protege contra XSS)
 * 2. Authorization: Bearer <access_token> (fallback para compatibilidade)
 *
 * O access_token é validado chamando o Auth service.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authBffService: AuthBffService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Tentar extrair token do cookie httpOnly (prioridade)
    let accessToken = request.cookies?.[COOKIE_NAME];

    // 2. Fallback: Authorization header (compatibilidade)
    if (!accessToken) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const user = await this.authBffService.validateAccessToken(accessToken);

      if (!user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user to request
      request.user = user;
      request.adminUser = user; // Alias for compatibility

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
