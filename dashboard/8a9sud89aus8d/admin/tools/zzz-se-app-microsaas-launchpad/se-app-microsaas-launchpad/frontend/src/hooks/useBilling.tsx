import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

export interface BillingPlan {
  id: string
  name: string
  priceCents: number
  currency: string
  interval: string
}

export interface BillingSubscription {
  id: string
  projectId: string
  planId: string
  externalUserId: string
  externalUserEmail: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'inactive' | 'pending' | 'paused'
  gateway: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  plan: BillingPlan
}

interface SubscriptionResponse {
  subscription: BillingSubscription | null
  hasActiveSubscription: boolean
}

interface CheckoutUrlResponse {
  checkoutUrl: string
}

interface StatusResponse {
  valid: boolean
  subscription: BillingSubscription | null
  reason?: string
}

export function useBilling() {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<SubscriptionResponse>('/billing/subscription')
      setSubscription(data.subscription)
      setHasActiveSubscription(data.hasActiveSubscription)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.get<SubscriptionResponse>('/billing/refresh')
      setSubscription(data.subscription)
      setHasActiveSubscription(data.hasActiveSubscription)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh subscription')
    } finally {
      setLoading(false)
    }
  }, [])

  const getCheckoutUrl = useCallback(async (planId?: string): Promise<string | null> => {
    try {
      const endpoint = planId
        ? `/billing/checkout-url?planId=${encodeURIComponent(planId)}`
        : '/billing/checkout-url'
      const data = await api.get<CheckoutUrlResponse>(endpoint)
      return data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get checkout URL')
      return null
    }
  }, [])

  const getStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      return await api.get<StatusResponse>('/billing/status')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get status')
      return null
    }
  }, [])

  const goToCheckout = useCallback(async (planId?: string) => {
    const checkoutUrl = await getCheckoutUrl(planId)
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    }
  }, [getCheckoutUrl])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return {
    subscription,
    hasActiveSubscription,
    loading,
    error,
    fetchSubscription,
    refreshSubscription,
    getCheckoutUrl,
    getStatus,
    goToCheckout,
  }
}

/**
 * Formata o preco em centavos para exibicao
 */
export function formatPrice(priceCents: number, currency: string = 'BRL'): string {
  const amount = priceCents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Retorna o label do status da subscription
 */
export function getStatusLabel(status: BillingSubscription['status']): string {
  const labels: Record<BillingSubscription['status'], string> = {
    active: 'Ativa',
    trialing: 'Em teste',
    past_due: 'Pagamento pendente',
    canceled: 'Cancelada',
    expired: 'Expirada',
    inactive: 'Inativa',
    pending: 'Pendente',
    paused: 'Pausada',
  }
  return labels[status] || status
}

/**
 * Retorna a cor do badge baseado no status
 */
export function getStatusColor(status: BillingSubscription['status']): string {
  const colors: Record<BillingSubscription['status'], string> = {
    active: '#22c55e',
    trialing: '#3b82f6',
    past_due: '#f59e0b',
    canceled: '#ef4444',
    expired: '#6b7280',
    inactive: '#6b7280',
    pending: '#f59e0b',
    paused: '#6b7280',
  }
  return colors[status] || '#6b7280'
}
