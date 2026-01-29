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
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../database/entities");
let AdminUsersService = class AdminUsersService {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }
    async findAll(options) {
        const { page, limit, search } = options;
        const where = {};
        if (search) {
            where.email = (0, typeorm_2.ILike)(`%${search}%`);
        }
        const [data, total] = await this.adminUserRepository.findAndCount({
            where,
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return {
            data: data.map((u) => this.sanitize(u)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        return this.adminUserRepository.findOne({ where: { id } });
    }
    async findByEmail(email) {
        return this.adminUserRepository.findOne({ where: { email } });
    }
    async findByEmailVerificationToken(token) {
        return this.adminUserRepository.findOne({ where: { emailVerificationToken: token } });
    }
    async findByPasswordResetToken(token) {
        return this.adminUserRepository.findOne({ where: { passwordResetToken: token } });
    }
    async findByProviderId(provider, providerId) {
        return this.adminUserRepository.findOne({
            where: { provider, providerId },
        });
    }
    async create(data) {
        const user = this.adminUserRepository.create({
            email: data.email,
            passwordHash: data.password,
            name: data.name,
            provider: data.provider || entities_1.AuthProvider.EMAIL,
            providerId: data.providerId,
            emailVerified: data.provider !== entities_1.AuthProvider.EMAIL,
        });
        return this.adminUserRepository.save(user);
    }
    async update(id, data) {
        const user = await this.adminUserRepository.findOne({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Admin user not found');
        }
        Object.assign(user, data);
        return this.adminUserRepository.save(user);
    }
    async setEmailVerificationToken(id, token, expires) {
        await this.adminUserRepository.update(id, {
            emailVerificationToken: token,
            emailVerificationExpires: expires,
        });
    }
    async verifyEmail(id) {
        await this.adminUserRepository.update(id, {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null,
        });
    }
    async setPasswordResetToken(id, token, expires) {
        await this.adminUserRepository.update(id, {
            passwordResetToken: token,
            passwordResetExpires: expires,
        });
    }
    async resetPassword(id, passwordHash) {
        await this.adminUserRepository.update(id, {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
        });
    }
    async updateLastLogin(id) {
        await this.adminUserRepository.update(id, {
            lastLoginAt: new Date(),
        });
    }
    async remove(id) {
        const result = await this.adminUserRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException('Admin user not found');
        }
    }
    async count() {
        return this.adminUserRepository.count();
    }
    sanitize(user) {
        const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = user;
        return safe;
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.AdminUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map