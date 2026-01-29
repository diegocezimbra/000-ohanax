import { Project } from './project.entity';
export declare class ApiKey {
    id: string;
    projectId: string;
    project: Project;
    name: string;
    keyHash: string;
    keyPrefix: string;
    lastUsedAt: Date;
    active: boolean;
    createdAt: Date;
}
