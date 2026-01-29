import { Repository } from 'typeorm';
import { AdminUser, AuthProvider } from '../database/entities';
interface CreateAdminUserDto {
    email: string;
    password: string;
    name?: string;
    provider?: AuthProvider;
    providerId?: string;
}
interface UpdateAdminUserDto {
    name?: string;
    avatar?: string;
}
export declare class AdminUsersService {
    private readonly adminUserRepository;
    constructor(adminUserRepository: Repository<AdminUser>);
    findAll(options: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        data: {
            id: string;
            email: string;
            name: string;
            avatar: string;
            emailVerified: boolean;
            emailVerificationExpires: Date | null;
            passwordResetExpires: Date | null;
            provider: string;
            providerId: string;
            lastLoginAt: Date;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<AdminUser | null>;
    findByEmail(email: string): Promise<AdminUser | null>;
    findByEmailVerificationToken(token: string): Promise<AdminUser | null>;
    findByPasswordResetToken(token: string): Promise<AdminUser | null>;
    findByProviderId(provider: AuthProvider, providerId: string): Promise<AdminUser | null>;
    create(data: CreateAdminUserDto): Promise<AdminUser>;
    update(id: string, data: UpdateAdminUserDto): Promise<AdminUser>;
    setEmailVerificationToken(id: string, token: string, expires: Date): Promise<void>;
    verifyEmail(id: string): Promise<void>;
    setPasswordResetToken(id: string, token: string, expires: Date): Promise<void>;
    resetPassword(id: string, passwordHash: string): Promise<void>;
    updateLastLogin(id: string): Promise<void>;
    remove(id: string): Promise<void>;
    count(): Promise<number>;
    private sanitize;
}
export {};
