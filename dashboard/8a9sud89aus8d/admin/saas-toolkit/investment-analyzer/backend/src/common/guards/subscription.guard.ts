import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { BillingService } from '../../billing/billing.service';

/**
 * Guard que verifica se o usuário tem uma assinatura ativa.
 * Use em controllers que requerem assinatura paga:
 *
 * @UseGuards(AuthGuard, SubscriptionGuard)
 * @Controller('protected')
 * export class ProtectedController { ... }
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const { valid, subscription, reason } = await this.billingService.isSubscriptionValid(user.id);

    if (!valid) {
      throw new ForbiddenException({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        reason,
        checkoutUrl: this.billingService.getCheckoutUrl(user.id, user.email, user.name),
      });
    }

    request.subscription = subscription;
    return true;
  }
}
