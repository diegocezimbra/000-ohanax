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
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let BillingService = BillingService_1 = class BillingService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BillingService_1.name);
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000;
        this.billingApiUrl = this.configService.get('BILLING_API_URL') || 'https://fax3cspfgv.us-east-1.awsapprunner.com';
        this.billingApiKey = this.configService.get('BILLING_API_KEY') || '';
        this.billingProjectId = this.configService.get('BILLING_PROJECT_ID') || '';
    }
    async getSubscription(userId) {
        const cacheKey = `subscription:${userId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.subscription;
        }
        try {
            const url = `${this.billingApiUrl}/checkout/${this.billingProjectId}/subscription/${userId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-api-key': this.billingApiKey,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                if (response.status === 404) {
                    this.cache.set(cacheKey, { subscription: null, expiresAt: Date.now() + this.cacheTTL });
                    return null;
                }
                throw new Error(`Billing API error: ${response.status}`);
            }
            const subscription = await response.json();
            this.cache.set(cacheKey, { subscription, expiresAt: Date.now() + this.cacheTTL });
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to fetch subscription for user ${userId}`, error);
            return null;
        }
    }
    async hasActiveSubscription(userId) {
        const subscription = await this.getSubscription(userId);
        if (!subscription)
            return false;
        return ['active', 'trialing'].includes(subscription.status);
    }
    async isSubscriptionValid(userId) {
        const subscription = await this.getSubscription(userId);
        if (!subscription) {
            return { valid: false, subscription: null, reason: 'no_subscription' };
        }
        if (['active', 'trialing'].includes(subscription.status)) {
            return { valid: true, subscription };
        }
        if (subscription.status === 'past_due') {
            return { valid: true, subscription, reason: 'payment_past_due' };
        }
        return { valid: false, subscription, reason: subscription.status };
    }
    clearCache(userId) {
        if (userId) {
            this.cache.delete(`subscription:${userId}`);
        }
        else {
            this.cache.clear();
        }
    }
    getCheckoutUrl(userId, email, name) {
        const billingFrontendUrl = this.configService.get('BILLING_FRONTEND_URL') || 'https://billing.ohanax.com';
        const params = new URLSearchParams({
            apiKey: this.billingApiKey,
            userId,
            email,
            ...(name && { name }),
        });
        return `${billingFrontendUrl}/checkout?${params}`;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BillingService);
//# sourceMappingURL=billing.service.js.map