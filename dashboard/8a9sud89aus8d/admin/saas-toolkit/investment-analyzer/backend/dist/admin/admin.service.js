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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const projects_service_1 = require("../projects/projects.service");
let AdminService = class AdminService {
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async getStats() {
        const projects = await this.projectsService.findAll({ page: 1, limit: 1 });
        return {
            totalProjects: projects.meta.total,
            apiCalls: 0,
        };
    }
    async getDashboard() {
        const stats = await this.getStats();
        const recentProjects = await this.projectsService.findAll({
            page: 1,
            limit: 5,
        });
        return {
            stats,
            recentProjects: recentProjects.data,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], AdminService);
//# sourceMappingURL=admin.service.js.map