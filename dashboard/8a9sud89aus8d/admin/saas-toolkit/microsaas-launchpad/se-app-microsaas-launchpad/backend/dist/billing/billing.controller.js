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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../common/guards/auth.guard");
const billing_service_1 = require("./billing.service");
let BillingController = class BillingController {
    constructor(billingService) {
        this.billingService = billingService;
    }
    async getSubscription(req) {
        const userId = req.user.id;
        const subscription = await this.billingService.getSubscription(userId);
        const hasActiveSubscription = subscription
            ? ['active', 'trialing'].includes(subscription.status)
            : false;
        return {
            subscription,
            hasActiveSubscription,
        };
    }
    async getCheckoutUrl(req, planId) {
        const { id: userId, email, name } = req.user;
        let checkoutUrl = this.billingService.getCheckoutUrl(userId, email, name);
        if (planId) {
            checkoutUrl += `&planId=${encodeURIComponent(planId)}`;
        }
        return { checkoutUrl };
    }
    async getStatus(req) {
        const userId = req.user.id;
        return this.billingService.isSubscriptionValid(userId);
    }
    async refreshSubscription(req) {
        const userId = req.user.id;
        this.billingService.clearCache(userId);
        return this.getSubscription(req);
    }
    async requireSubscription(req) {
        const userId = req.user.id;
        const { valid, reason } = await this.billingService.isSubscriptionValid(userId);
        if (!valid) {
            const checkoutUrl = this.billingService.getCheckoutUrl(userId, req.user.email, req.user.name);
            throw new common_1.ForbiddenException({
                code: 'SUBSCRIPTION_REQUIRED',
                message: 'Uma subscription ativa é necessária para acessar este recurso',
                reason,
                checkoutUrl,
            });
        }
        return { message: 'Você tem acesso a recursos premium!' };
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('subscription'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.Get)('checkout-url'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getCheckoutUrl", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('refresh'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "refreshSubscription", null);
__decorate([
    (0, common_1.Get)('require-subscription'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "requireSubscription", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map