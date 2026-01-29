import { ConfigService } from '@nestjs/config';
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
export declare class AuthBffService {
    private readonly configService;
    private readonly adminUserRepository;
    private readonly adminSessionRepository;
    private readonly logger;
    private readonly authServiceUrl;
    private readonly authFrontendUrl;
    private readonly apiKey;
    private readonly frontendUrl;
    constructor(configService: ConfigService, adminUserRepository: Repository<AdminUser>, adminSessionRepository: Repository<AdminSession>);
    getLoginUrl(): Promise<string>;
    exchangeCodeForTokens(code: string, redirectUri: string, ipAddress?: string, userAgent?: string): Promise<{
        accessToken: string;
        user: AuthUser;
    }>;
    validateAccessToken(accessToken: string): Promise<AuthUser | null>;
    refreshAccessToken(userId: string): Promise<{
        accessToken: string;
        user: AuthUser;
    } | null>;
    logout(userId: string): Promise<void>;
    private saveSession;
    private ensureLocalUser;
}
