import { ApiKey } from './api-key.entity';
import { AdminUser } from './admin-user.entity';
export declare class Project {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    owner: AdminUser;
    allowedDomains: string[];
    settings: {
        theme?: {
            primaryColor?: string;
            backgroundColor?: string;
            logoUrl?: string;
        };
        [key: string]: any;
    };
    apiKeys: ApiKey[];
    createdAt: Date;
    updatedAt: Date;
}
