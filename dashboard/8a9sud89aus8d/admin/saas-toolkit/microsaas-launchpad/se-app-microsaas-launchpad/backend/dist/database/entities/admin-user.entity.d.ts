export declare enum AuthProvider {
    EMAIL = "email",
    GOOGLE = "google",
    GITHUB = "github"
}
export declare class AdminUser {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    avatar: string;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpires: Date | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    provider: string;
    providerId: string;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
