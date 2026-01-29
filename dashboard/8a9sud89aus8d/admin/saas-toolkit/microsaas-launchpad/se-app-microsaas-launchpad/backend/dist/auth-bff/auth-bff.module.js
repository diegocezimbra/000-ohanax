"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthBffModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_bff_service_1 = require("./auth-bff.service");
const auth_bff_controller_1 = require("./auth-bff.controller");
const auth_bff_guard_1 = require("./auth-bff.guard");
const admin_user_entity_1 = require("../database/entities/admin-user.entity");
const admin_session_entity_1 = require("../database/entities/admin-session.entity");
let AuthBffModule = class AuthBffModule {
};
exports.AuthBffModule = AuthBffModule;
exports.AuthBffModule = AuthBffModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([admin_user_entity_1.AdminUser, admin_session_entity_1.AdminSession]),
        ],
        controllers: [auth_bff_controller_1.AuthBffController],
        providers: [auth_bff_service_1.AuthBffService, auth_bff_guard_1.AuthBffGuard],
        exports: [auth_bff_service_1.AuthBffService, auth_bff_guard_1.AuthBffGuard],
    })
], AuthBffModule);
//# sourceMappingURL=auth-bff.module.js.map