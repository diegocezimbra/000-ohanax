import React from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '../../design-system/components/Card/Card'
import { Badge } from '../../design-system/components/Badge/Badge'
import { Button } from '../../design-system/components/Button/Button'
import { Spinner } from '../../design-system/components/Loading/Loading'
import { useBilling, formatPrice, getStatusLabel, BillingSubscription } from '../../hooks/useBilling'
import './SubscriptionStatus.css'

interface SubscriptionStatusProps {
  onUpgrade?: () => void
  onManage?: () => void
  showManageButton?: boolean
}

const statusToVariant: Record<BillingSubscription['status'], 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  canceled: 'danger',
  expired: 'default',
  inactive: 'default',
  pending: 'warning',
  paused: 'default',
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  onUpgrade,
  onManage,
  showManageButton = true,
}) => {
  const { subscription, hasActiveSubscription, loading, error, goToCheckout } = useBilling()

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      goToCheckout()
    }
  }

  if (loading) {
    return (
      <Card variant="bordered">
        <CardContent>
          <div className="subscription-loading">
            <Spinner size="sm" />
            <span>Carregando subscription...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="bordered">
        <CardContent>
          <div className="subscription-error">
            <span>Erro ao carregar subscription: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card variant="bordered">
        <CardHeader
          title="Subscription"
          description="Voce ainda nao tem uma subscription ativa"
        />
        <CardContent>
          <div className="subscription-empty">
            <p>Adquira uma subscription para desbloquear recursos premium.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="primary" onClick={handleUpgrade}>
            Assinar agora
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const periodEnd = new Date(subscription.currentPeriodEnd)
  const formattedDate = periodEnd.toLocaleDateString('pt-BR')

  return (
    <Card variant="bordered">
      <CardHeader
        title="Subscription"
        action={
          <Badge variant={statusToVariant[subscription.status]} dot>
            {getStatusLabel(subscription.status)}
          </Badge>
        }
      />
      <CardContent>
        <div className="subscription-details">
          <div className="subscription-plan">
            <span className="subscription-plan-name">{subscription.plan.name}</span>
            <span className="subscription-plan-price">
              {formatPrice(subscription.plan.priceCents, subscription.plan.currency)}/{subscription.plan.interval === 'month' ? 'mes' : 'ano'}
            </span>
          </div>

          <div className="subscription-info">
            {hasActiveSubscription && (
              <p className="subscription-period">
                Valido ate: <strong>{formattedDate}</strong>
              </p>
            )}

            {subscription.cancelAtPeriodEnd && (
              <p className="subscription-cancel-notice">
                Sua subscription sera cancelada em {formattedDate}
              </p>
            )}

            {subscription.status === 'past_due' && (
              <p className="subscription-warning">
                Pagamento pendente. Por favor, atualize seu metodo de pagamento.
              </p>
            )}
          </div>
        </div>
      </CardContent>

      {showManageButton && (
        <CardFooter>
          {hasActiveSubscription ? (
            onManage && (
              <Button variant="secondary" onClick={onManage}>
                Gerenciar subscription
              </Button>
            )
          ) : (
            <Button variant="primary" onClick={handleUpgrade}>
              {subscription.status === 'canceled' ? 'Reativar' : 'Assinar'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

export default SubscriptionStatus
