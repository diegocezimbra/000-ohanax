"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_users_module_1 = require("../admin-users/admin-users.module");
const admin_sessions_module_1 = require("../admin-sessions/admin-sessions.module");
const projects_module_1 = require("../projects/projects.module");
const guards_1 = require("../common/guards");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_users_module_1.AdminUsersModule, admin_sessions_module_1.AdminSessionsModule, projects_module_1.ProjectsModule],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, guards_1.AuthGuard],
        exports: [guards_1.AuthGuard],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map