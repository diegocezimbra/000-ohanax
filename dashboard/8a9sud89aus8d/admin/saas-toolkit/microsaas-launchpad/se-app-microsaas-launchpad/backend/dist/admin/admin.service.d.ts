import { ProjectsService } from '../projects/projects.service';
export declare class AdminService {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
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
