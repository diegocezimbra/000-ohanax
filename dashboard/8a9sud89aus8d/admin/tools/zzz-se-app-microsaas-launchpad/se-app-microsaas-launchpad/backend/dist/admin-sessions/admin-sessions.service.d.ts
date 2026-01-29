import { Repository } from 'typeorm';
import { AdminSession } from '../database/entities';
export declare class AdminSessionsService {
    private readonly adminSessionRepository;
    constructor(adminSessionRepository: Repository<AdminSession>);
    create(data: {
        adminUserId: string;
        refreshToken: string;
        ipAddress?: string;
        userAgent?: string;
        expiresAt: Date;
    }): Promise<AdminSession>;
    findByRefreshToken(refreshToken: string): Promise<AdminSession | null>;
    findByToken(token: string): Promise<AdminSession | null>;
    findByAdminUserId(adminUserId: string): Promise<AdminSession[]>;
    revokeSession(id: string): Promise<void>;
    revokeAllAdminUserSessions(adminUserId: string): Promise<void>;
    revokeByRefreshToken(refreshToken: string): Promise<void>;
    cleanExpiredSessions(): Promise<void>;
    countActiveSessions(adminUserId: string): Promise<number>;
}
