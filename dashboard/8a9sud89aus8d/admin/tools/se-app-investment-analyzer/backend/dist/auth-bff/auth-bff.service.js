"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthBffService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthBffService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const admin_user_entity_1 = require("../database/entities/admin-user.entity");
const admin_session_entity_1 = require("../database/entities/admin-session.entity");
let AuthBffService = AuthBffService_1 = class AuthBffService {
    constructor(configService, adminUserRepository, adminSessionRepository) {
        this.configService = configService;
        this.adminUserRepository = adminUserRepository;
        this.adminSessionRepository = adminSessionRepository;
        this.logger = new common_1.Logger(AuthBffService_1.name);
        this.authServiceUrl = this.configService.get('AUTHIFY_URL') || '';
        this.authFrontendUrl = this.configService.get('AUTHIFY_FRONTEND_URL') || '';
        this.apiKey = this.configService.get('AUTHIFY_API_KEY') || '';
        this.frontendUrl = this.configService.get('FRONTEND_URL') || '';
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
    async getLoginUrl() {
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
        }
        catch (error) {
            this.logger.error(`Failed to get login URL: ${error.message}`);
            throw new Error('Failed to generate login URL. Please try again.');
        }
    }
    async exchangeCodeForTokens(code, redirectUri, ipAddress, userAgent) {
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
                throw new common_1.UnauthorizedException(error.error_description || 'Token exchange failed');
            }
            const tokenResponse = await response.json();
            await this.ensureLocalUser(tokenResponse.user);
            await this.saveSession(tokenResponse.user.id, tokenResponse.refresh_token, ipAddress, userAgent);
            return {
                accessToken: tokenResponse.access_token,
                user: tokenResponse.user,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            this.logger.error(`Failed to exchange code: ${error.message}`);
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
    async validateAccessToken(accessToken) {
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
        }
        catch (error) {
            this.logger.error(`Failed to validate access token: ${error.message}`);
            return null;
        }
    }
    async refreshAccessToken(userId) {
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
                await this.adminSessionRepository.update(session.id, { active: false });
                return null;
            }
            const tokenResponse = await response.json();
            await this.adminSessionRepository.update(session.id, {
                refreshToken: tokenResponse.refresh_token,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
            return {
                accessToken: tokenResponse.access_token,
                user: tokenResponse.user,
            };
        }
        catch (error) {
            this.logger.error(`Failed to refresh token: ${error.message}`);
            return null;
        }
    }
    async logout(userId) {
        const session = await this.adminSessionRepository.findOne({
            where: { adminUserId: userId, active: true },
            order: { createdAt: 'DESC' },
        });
        if (session) {
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
            }
            catch (error) {
                this.logger.error(`Failed to revoke token on Auth: ${error.message}`);
            }
            await this.adminSessionRepository.update(session.id, { active: false });
        }
    }
    async saveSession(userId, refreshToken, ipAddress, userAgent) {
        await this.adminSessionRepository.update({ adminUserId: userId, active: true }, { active: false });
        const session = this.adminSessionRepository.create({
            adminUserId: userId,
            refreshToken,
            ipAddress,
            userAgent,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            active: true,
        });
        await this.adminSessionRepository.save(session);
    }
    async ensureLocalUser(authUser) {
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
            }
            else {
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
        }
        catch (error) {
            this.logger.error(`Failed to sync user to local DB: ${error.message}`);
        }
    }
};
exports.AuthBffService = AuthBffService;
exports.AuthBffService = AuthBffService = AuthBffService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(admin_user_entity_1.AdminUser)),
    __param(2, (0, typeorm_1.InjectRepository)(admin_session_entity_1.AdminSession)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthBffService);
//# sourceMappingURL=auth-bff.service.js.map