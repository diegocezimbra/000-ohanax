import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly cache = new Map<string, { subscription: BillingSubscription | null; expiresAt: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  private readonly billingApiUrl: string;
  private readonly billingApiKey: string;
  private readonly billingProjectId: string;

  constructor(private readonly configService: ConfigService) {
    this.billingApiUrl = this.configService.get('BILLING_API_URL') || 'https://fax3cspfgv.us-east-1.awsapprunner.com';
    this.billingApiKey = this.configService.get('BILLING_API_KEY') || '';
    this.billingProjectId = this.configService.get('BILLING_PROJECT_ID') || '';
  }

  async getSubscription(userId: string): Promise<BillingSubscription | null> {
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

      const subscription = await response.json() as BillingSubscription;
      this.cache.set(cacheKey, { subscription, expiresAt: Date.now() + this.cacheTTL });
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to fetch subscription for user ${userId}`, error);
      return null;
    }
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    if (!subscription) return false;
    return ['active', 'trialing'].includes(subscription.status);
  }

  async isSubscriptionValid(userId: string): Promise<{ valid: boolean; subscription: BillingSubscription | null; reason?: string }> {
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

  clearCache(userId?: string) {
    if (userId) {
      this.cache.delete(`subscription:${userId}`);
    } else {
      this.cache.clear();
    }
  }

  getCheckoutUrl(userId: string, email: string, name?: string): string {
    const billingFrontendUrl = this.configService.get('BILLING_FRONTEND_URL') || 'https://billing.ohanax.com';
    const params = new URLSearchParams({
      apiKey: this.billingApiKey,
      userId,
      email,
      ...(name && { name }),
    });
    return `${billingFrontendUrl}/checkout?${params}`;
  }
}
