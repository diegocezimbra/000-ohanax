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
exports.AdminSession = void 0;
const typeorm_1 = require("typeorm");
const admin_user_entity_1 = require("./admin-user.entity");
let AdminSession = class AdminSession {
};
exports.AdminSession = AdminSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AdminSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'admin_user_id' }),
    __metadata("design:type", String)
], AdminSession.prototype, "adminUserId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => admin_user_entity_1.AdminUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'admin_user_id' }),
    __metadata("design:type", admin_user_entity_1.AdminUser)
], AdminSession.prototype, "adminUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refresh_token' }),
    __metadata("design:type", String)
], AdminSession.prototype, "refreshToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminSession.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], AdminSession.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], AdminSession.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], AdminSession.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AdminSession.prototype, "createdAt", void 0);
exports.AdminSession = AdminSession = __decorate([
    (0, typeorm_1.Entity)('admin_sessions'),
    (0, typeorm_1.Index)(['refreshToken'])
], AdminSession);
//# sourceMappingURL=admin-session.entity.js.map