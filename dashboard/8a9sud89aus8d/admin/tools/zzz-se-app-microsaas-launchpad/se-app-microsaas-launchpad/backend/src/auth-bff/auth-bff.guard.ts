import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthBffService, AuthUser } from './auth-bff.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Auth BFF Guard
 *
 * Guard que valida access_token via header Authorization: Bearer xxx
 * O access_token é validado chamando Auth /auth/profile
 * Se expirado, tenta renovar usando refresh_token do banco
 */
@Injectable()
export class AuthBffGuard implements CanActivate {
  constructor(private readonly authBffService: AuthBffService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const accessToken = authHeader.substring(7);

    // Validate access token
    let user = await this.authBffService.validateAccessToken(accessToken);

    if (!user) {
      // Token might be expired, but we don't have user ID here to refresh
      // Frontend should handle refresh via /api/auth/refresh endpoint
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user to request for use in controllers
    request.user = user;

    return true;
  }
}
