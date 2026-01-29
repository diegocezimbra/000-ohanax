import { Repository } from 'typeorm';
import { Project, ApiKey } from '../database/entities';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectsService {
    private readonly projectRepository;
    private readonly apiKeyRepository;
    constructor(projectRepository: Repository<Project>, apiKeyRepository: Repository<ApiKey>);
    findAll(options: {
        page: number;
        limit: number;
        ownerId?: string;
    }): Promise<{
        data: Project[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<Project | null>;
    findByApiKey(apiKey: string): Promise<Project | null>;
    create(ownerId: string, data: CreateProjectDto): Promise<Project>;
    update(id: string, data: UpdateProjectDto): Promise<Project>;
    remove(id: string): Promise<void>;
    createApiKey(projectId: string, name: string): Promise<{
        apiKey: ApiKey;
        plainKey: string;
    }>;
    revokeApiKey(projectId: string, keyId: string): Promise<void>;
    deleteApiKey(keyId: string): Promise<void>;
    getApiKeys(projectId: string): Promise<{
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
    updateSettings(projectId: string, data: any): Promise<Project>;
    private hashApiKey;
}
