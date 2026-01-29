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
exports.AuthBffGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_bff_service_1 = require("./auth-bff.service");
let AuthBffGuard = class AuthBffGuard {
    constructor(authBffService) {
        this.authBffService = authBffService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const accessToken = authHeader.substring(7);
        let user = await this.authBffService.validateAccessToken(accessToken);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        request.user = user;
        return true;
    }
};
exports.AuthBffGuard = AuthBffGuard;
exports.AuthBffGuard = AuthBffGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_bff_service_1.AuthBffService])
], AuthBffGuard);
//# sourceMappingURL=auth-bff.guard.js.map