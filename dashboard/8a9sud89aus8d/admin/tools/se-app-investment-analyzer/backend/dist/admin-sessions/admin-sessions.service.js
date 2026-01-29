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
exports.AdminSessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
let AdminSessionsService = class AdminSessionsService {
    constructor(adminSessionRepository) {
        this.adminSessionRepository = adminSessionRepository;
    }
    async create(data) {
        const session = this.adminSessionRepository.create(data);
        return this.adminSessionRepository.save(session);
    }
    async findByRefreshToken(refreshToken) {
        return this.adminSessionRepository.findOne({
            where: { refreshToken, active: true },
            relations: ['adminUser'],
        });
    }
    async findByToken(token) {
        return this.adminSessionRepository.findOne({
            where: { refreshToken: token, active: true },
            relations: ['adminUser'],
        });
    }
    async findByAdminUserId(adminUserId) {
        return this.adminSessionRepository.find({
            where: { adminUserId, active: true },
            order: { createdAt: 'DESC' },
        });
    }
    async revokeSession(id) {
        await this.adminSessionRepository.update(id, { active: false });
    }
    async revokeAllAdminUserSessions(adminUserId) {
        await this.adminSessionRepository.update({ adminUserId, active: true }, { active: false });
    }
    async revokeByRefreshToken(refreshToken) {
        await this.adminSessionRepository.update({ refreshToken }, { active: false });
    }
    async cleanExpiredSessions() {
        await this.adminSessionRepository.delete({
            expiresAt: (0, typeorm_2.LessThan)(new Date()),
        });
    }
    async countActiveSessions(adminUserId) {
        return this.adminSessionRepository.count({
            where: { adminUserId, active: true },
        });
    }
};
exports.AdminSessionsService = AdminSessionsService;
exports.AdminSessionsService = AdminSessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.AdminSession)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminSessionsService);
//# sourceMappingURL=admin-sessions.service.js.map