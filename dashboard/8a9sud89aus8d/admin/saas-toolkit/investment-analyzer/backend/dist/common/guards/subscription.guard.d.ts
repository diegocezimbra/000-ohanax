import { CanActivate, ExecutionContext } from '@nestjs/common';
import { BillingService } from '../../billing/billing.service';
export declare class SubscriptionGuard implements CanActivate {
    private readonly billingService;
    constructor(billingService: BillingService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
