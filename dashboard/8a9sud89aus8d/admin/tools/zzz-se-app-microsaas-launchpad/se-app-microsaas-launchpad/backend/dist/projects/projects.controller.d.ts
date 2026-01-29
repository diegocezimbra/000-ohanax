import { Request as ExpressRequest } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AdminUser } from '../database/entities';
interface ProjectRequest extends ExpressRequest {
    adminUser?: AdminUser;
}
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    findAll(req: ProjectRequest, page?: number, limit?: number): Promise<{
        data: import("../database/entities").Project[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<import("../database/entities").Project | null>;
    create(req: ProjectRequest, createProjectDto: CreateProjectDto): Promise<import("../database/entities").Project>;
    update(id: string, updateProjectDto: UpdateProjectDto): Promise<import("../database/entities").Project>;
    remove(id: string): Promise<void>;
    getApiKeys(id: string): Promise<{
        data: {
            id: string;
            name: string;
            keyPrefix: string;
            active: boolean;
            createdAt: Date;
            lastUsedAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    createApiKey(id: string, name: string): Promise<{
        apiKey: import("../database/entities").ApiKey;
        plainKey: string;
    }>;
    revokeApiKey(id: string, keyId: string): Promise<void>;
}
export {};
