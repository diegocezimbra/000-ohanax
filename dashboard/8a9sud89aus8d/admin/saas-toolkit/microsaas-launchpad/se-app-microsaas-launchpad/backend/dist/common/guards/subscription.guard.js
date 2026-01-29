"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const billing_service_1 = require("../../billing/billing.service");
let SubscriptionGuard = class SubscriptionGuard {
    constructor(billingService) {
        this.billingService = billingService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        const { valid, subscription, reason } = await this.billingService.isSubscriptionValid(user.id);
        if (!valid) {
            throw new common_1.ForbiddenException({
                message: 'Active subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
                reason,
                checkoutUrl: this.billingService.getCheckoutUrl(user.id, user.email, user.name),
            });
        }
        request.subscription = subscription;
        return true;
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map