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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthBffController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const auth_bff_service_1 = require("./auth-bff.service");
const COOKIE_NAME = 'app_access_token';
const COOKIE_MAX_AGE = 15 * 60 * 1000;
let AuthBffController = class AuthBffController {
    constructor(authBffService, configService) {
        this.authBffService = authBffService;
        this.configService = configService;
        this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        this.isProduction = this.configService.get('NODE_ENV') === 'production';
    }
    setAccessTokenCookie(res, accessToken) {
        res.cookie(COOKIE_NAME, accessToken, {
            httpOnly: true,
            secure: this.isProduction,
            sameSite: this.isProduction ? 'strict' : 'lax',
            maxAge: COOKIE_MAX_AGE,
            path: '/',
        });
    }
    clearAccessTokenCookie(res) {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: this.isProduction,
            sameSite: this.isProduction ? 'strict' : 'lax',
            path: '/',
        });
    }
    extractToken(req) {
        const cookieToken = req.cookies?.[COOKIE_NAME];
        if (cookieToken) {
            return cookieToken;
        }
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
    async login(res) {
        try {
            const loginUrl = await this.authBffService.getLoginUrl();
            res.redirect(loginUrl);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate login URL';
            res.redirect(`${this.frontendUrl}?error=${encodeURIComponent(errorMessage)}`);
        }
    }
    async callback(code, req, res) {
        if (!code) {
            throw new common_1.UnauthorizedException('Missing authorization code');
        }
        const redirectUri = `${this.frontendUrl}/auth/callback`;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const { accessToken, user } = await this.authBffService.exchangeCodeForTokens(code, redirectUri, ipAddress, userAgent);
        this.setAccessTokenCookie(res, accessToken);
        return {
            token_type: 'Bearer',
            user,
        };
    }
    async me(req) {
        const accessToken = this.extractToken(req);
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Not authenticated');
        }
        const user = await this.authBffService.validateAccessToken(accessToken);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        return { user };
    }
    async status(req) {
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
    async refresh(userId, res) {
        if (!userId) {
            throw new common_1.UnauthorizedException('User ID required');
        }
        const result = await this.authBffService.refreshAccessToken(userId);
        if (!result) {
            this.clearAccessTokenCookie(res);
            throw new common_1.UnauthorizedException('Session expired. Please login again.');
        }
        this.setAccessTokenCookie(res, result.accessToken);
        return {
            token_type: 'Bearer',
            user: result.user,
        };
    }
    async logout(userId, res) {
        if (userId) {
            await this.authBffService.logout(userId);
        }
        this.clearAccessTokenCookie(res);
        return { success: true, message: 'Logged out successfully' };
    }
};
exports.AuthBffController = AuthBffController;
__decorate([
    (0, common_1.Get)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Redirect to Authify login' }),
    (0, swagger_1.ApiResponse)({ status: 302, description: 'Redirects to Authify hosted login' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('callback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Exchange authorization code for access token' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { code: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns user info (token set in httpOnly cookie)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid code' }),
    __param(0, (0, common_1.Body)('code')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user info' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User info' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Not authenticated' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check authentication status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authentication status' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { user_id: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'New access token (set in httpOnly cookie)' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Session expired' }),
    __param(0, (0, common_1.Body)('user_id')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Logout user' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { user_id: { type: 'string' } } } }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logged out successfully' }),
    __param(0, (0, common_1.Body)('user_id')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthBffController.prototype, "logout", null);
exports.AuthBffController = AuthBffController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_bff_service_1.AuthBffService,
        config_1.ConfigService])
], AuthBffController);
//# sourceMappingURL=auth-bff.controller.js.map