import { Request } from 'express';
import { BillingService, BillingSubscription } from './billing.service';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        name?: string;
    };
}
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    getSubscription(req: AuthenticatedRequest): Promise<{
        subscription: BillingSubscription | null;
        hasActiveSubscription: boolean;
    }>;
    getCheckoutUrl(req: AuthenticatedRequest, planId?: string): Promise<{
        checkoutUrl: string;
    }>;
    getStatus(req: AuthenticatedRequest): Promise<{
        valid: boolean;
        subscription: BillingSubscription | null;
        reason?: string;
    }>;
    refreshSubscription(req: AuthenticatedRequest): Promise<{
        subscription: BillingSubscription | null;
        hasActiveSubscription: boolean;
    }>;
    requireSubscription(req: AuthenticatedRequest): Promise<{
        message: string;
    }>;
}
export {};
