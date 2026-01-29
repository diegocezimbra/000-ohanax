import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        totalProjects: number;
        apiCalls: number;
    }>;
    getDashboard(): Promise<{
        stats: {
            totalProjects: number;
            apiCalls: number;
        };
        recentProjects: import("../database/entities").Project[];
    }>;
}
