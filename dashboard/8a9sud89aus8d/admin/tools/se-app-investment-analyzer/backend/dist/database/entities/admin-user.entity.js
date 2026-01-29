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
exports.AdminUser = exports.AuthProvider = void 0;
const typeorm_1 = require("typeorm");
var AuthProvider;
(function (AuthProvider) {
    AuthProvider["EMAIL"] = "email";
    AuthProvider["GOOGLE"] = "google";
    AuthProvider["GITHUB"] = "github";
})(AuthProvider || (exports.AuthProvider = AuthProvider = {}));
let AdminUser = class AdminUser {
};
exports.AdminUser = AdminUser;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminUser.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AdminUser.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminUser.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminUser.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminUser.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_verified', default: false }),
    __metadata("design:type", Boolean)
], AdminUser.prototype, "emailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_verification_token', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "emailVerificationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_verification_expires', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "emailVerificationExpires", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_reset_token', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "passwordResetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_reset_expires', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], AdminUser.prototype, "passwordResetExpires", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'email' }),
    __metadata("design:type", String)
], AdminUser.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'provider_id', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminUser.prototype, "providerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], AdminUser.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AdminUser.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], AdminUser.prototype, "updatedAt", void 0);
exports.AdminUser = AdminUser = __decorate([
    (0, typeorm_1.Entity)('admin_users'),
    (0, typeorm_1.Index)(['email'], { unique: true })
], AdminUser);
//# sourceMappingURL=admin-user.entity.js.map