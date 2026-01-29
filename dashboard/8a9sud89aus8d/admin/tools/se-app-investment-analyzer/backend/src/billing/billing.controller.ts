import { Controller, Get, UseGuards, Req, Query, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { BillingService, BillingSubscription } from './billing.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * BillingController - Endpoints para gerenciamento de billing/subscription
 *
 * Endpoints:
 * - GET /billing/subscription - Retorna a subscription atual do usuário
 * - GET /billing/checkout-url - Retorna URL para checkout (se não tem subscription)
 * - GET /billing/status - Verifica se usuário tem subscription ativa
 */
@Controller('billing')
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Retorna a subscription atual do usuário autenticado
   */
  @Get('subscription')
  async getSubscription(@Req() req: AuthenticatedRequest): Promise<{
    subscription: BillingSubscription | null;
    hasActiveSubscription: boolean;
  }> {
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

  /**
   * Retorna URL para página de checkout
   * Opcional: pode passar planId como query param
   */
  @Get('checkout-url')
  async getCheckoutUrl(
    @Req() req: AuthenticatedRequest,
    @Query('planId') planId?: string,
  ): Promise<{ checkoutUrl: string }> {
    const { id: userId, email, name } = req.user;
    let checkoutUrl = this.billingService.getCheckoutUrl(userId, email, name);

    if (planId) {
      checkoutUrl += `&planId=${encodeURIComponent(planId)}`;
    }

    return { checkoutUrl };
  }

  /**
   * Verifica status da subscription do usuário
   * Retorna se é válida e razão se não for
   */
  @Get('status')
  async getStatus(@Req() req: AuthenticatedRequest): Promise<{
    valid: boolean;
    subscription: BillingSubscription | null;
    reason?: string;
  }> {
    const userId = req.user.id;
    return this.billingService.isSubscriptionValid(userId);
  }

  /**
   * Limpa cache de subscription do usuário
   * Útil após webhook de billing atualizar subscription
   */
  @Get('refresh')
  async refreshSubscription(@Req() req: AuthenticatedRequest): Promise<{
    subscription: BillingSubscription | null;
    hasActiveSubscription: boolean;
  }> {
    const userId = req.user.id;
    this.billingService.clearCache(userId);
    return this.getSubscription(req);
  }

  /**
   * Endpoint protegido que requer subscription ativa
   * Exemplo de como proteger endpoints que exigem pagamento
   * Retorna 403 com checkoutUrl se não tiver subscription
   */
  @Get('require-subscription')
  async requireSubscription(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    const userId = req.user.id;
    const { valid, reason } = await this.billingService.isSubscriptionValid(userId);

    if (!valid) {
      const checkoutUrl = this.billingService.getCheckoutUrl(
        userId,
        req.user.email,
        req.user.name,
      );

      throw new ForbiddenException({
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Uma subscription ativa é necessária para acessar este recurso',
        reason,
        checkoutUrl,
      });
    }

    return { message: 'Você tem acesso a recursos premium!' };
  }
}
