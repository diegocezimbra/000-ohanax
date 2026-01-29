import { ConfigService } from '@nestjs/config';
export interface BillingSubscription {
    id: string;
    projectId: string;
    planId: string;
    externalUserId: string;
    externalUserEmail: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'inactive' | 'pending' | 'paused';
    gateway: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: {
        id: string;
        name: string;
        priceCents: number;
        currency: string;
        interval: string;
    };
}
export declare class BillingService {
    private readonly configService;
    private readonly logger;
    private readonly cache;
    private readonly cacheTTL;
    private readonly billingApiUrl;
    private readonly billingApiKey;
    private readonly billingProjectId;
    constructor(configService: ConfigService);
    getSubscription(userId: string): Promise<BillingSubscription | null>;
    hasActiveSubscription(userId: string): Promise<boolean>;
    isSubscriptionValid(userId: string): Promise<{
        valid: boolean;
        subscription: BillingSubscription | null;
        reason?: string;
    }>;
    clearCache(userId?: string): void;
    getCheckoutUrl(userId: string, email: string, name?: string): string;
}
