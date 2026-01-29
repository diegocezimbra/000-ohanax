const API_URL = import.meta.env.VITE_API_URL
const STORAGE_PREFIX = import.meta.env.VITE_STORAGE_PREFIX || 'myapp'

/**
 * API Client - Usa httpOnly cookies para autenticacao (mais seguro contra XSS)
 *
 * O access_token é armazenado em httpOnly cookie pelo backend.
 * O browser envia automaticamente o cookie em todas as requisicoes
 * quando usamos credentials: 'include'.
 *
 * Nao é mais necessario gerenciar tokens no localStorage!
 */
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Envia cookies automaticamente
    })

    if (response.status === 401) {
      // Token expired or invalid - clear user data and redirect to login
      localStorage.removeItem(`${STORAGE_PREFIX}_user`)
      window.location.href = `${this.baseUrl}/api/auth/login`
      throw new Error('Unauthorized')
    }

    if (response.status === 403) {
      // Check for subscription required error
      const error = await response.json().catch(() => ({ message: 'Forbidden' }))

      if (error.code === 'SUBSCRIPTION_REQUIRED' && error.checkoutUrl) {
        window.location.href = error.checkoutUrl
        throw new Error('Subscription required')
      }

      throw new Error(error.message || 'Forbidden')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || 'Request failed')
    }

    // Handle 204 No Content responses (common for DELETE operations)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T
    }

    // Try to parse JSON, return undefined if empty
    const text = await response.text()
    if (!text) {
      return undefined as T
    }

    return JSON.parse(text) as T
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  put<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  patch<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)
