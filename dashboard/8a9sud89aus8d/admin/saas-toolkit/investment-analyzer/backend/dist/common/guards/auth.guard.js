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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_bff_service_1 = require("../../auth-bff/auth-bff.service");
const COOKIE_NAME = 'app_access_token';
let AuthGuard = class AuthGuard {
    constructor(authBffService) {
        this.authBffService = authBffService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        let accessToken = request.cookies?.[COOKIE_NAME];
        if (!accessToken) {
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                accessToken = authHeader.substring(7);
            }
        }
        if (!accessToken) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        try {
            const user = await this.authBffService.validateAccessToken(accessToken);
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
            request.user = user;
            request.adminUser = user;
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_bff_service_1.AuthBffService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map