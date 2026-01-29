import { AdminUser } from './admin-user.entity';
export declare class AdminSession {
    id: string;
    adminUserId: string;
    adminUser: AdminUser;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    active: boolean;
    createdAt: Date;
}
