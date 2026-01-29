import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  emailVerified?: boolean
  projectId?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_URL = import.meta.env.VITE_API_URL
const STORAGE_PREFIX = import.meta.env.VITE_STORAGE_PREFIX || 'myapp'
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// Mock user para desenvolvimento
const MOCK_USER: User = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  name: 'Developer User',
  avatar: null,
  emailVerified: true,
  projectId: 'dev-project-123'
}

/**
 * AuthProvider - httpOnly Cookie-based authentication (mais seguro contra XSS)
 *
 * Este provider implementa autenticacao usando httpOnly cookies.
 * - access_token: armazenado em httpOnly cookie (gerenciado pelo backend)
 * - refresh_token: armazenado no backend (banco de dados)
 * - user data: armazenado em localStorage (apenas para exibicao)
 *
 * Fluxo:
 * 1. Usuario clica em login
 * 2. Frontend redireciona para GET /api/auth/login no backend
 * 3. Backend redireciona para Authify hosted login
 * 4. Authify redireciona para /auth/callback no frontend com code
 * 5. Frontend chama POST /api/auth/callback com code
 * 6. Backend seta httpOnly cookie com access_token
 * 7. Frontend armazena user em localStorage (apenas para exibicao)
 * 8. Frontend usa credentials: 'include' em todas requisicoes
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Validate authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // DEV MODE: bypass authentication
      if (DEV_MODE) {
        console.log('[Auth] DEV MODE: Using mock user')
        setUser(MOCK_USER)
        setIsLoading(false)
        return
      }
      try {
        console.log('[Auth] Checking authentication status...')

        // Validate with backend (cookie is sent automatically)
        const response = await fetch(`${API_URL}/api/auth/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Envia cookies automaticamente
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[Auth] Status response:', data)

          if (data.authenticated && data.user) {
            console.log('[Auth] User authenticated:', data.user.email)
            setUser(data.user)
            // Update stored user in case it changed
            localStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(data.user))
            setIsLoading(false)
          } else {
            // Token invalid, try to refresh
            console.log('[Auth] Token invalid, trying to refresh...')
            await tryRefreshToken()
          }
        } else if (response.status === 401) {
          // Token expired, try to refresh
          console.log('[Auth] Token expired, trying to refresh...')
          await tryRefreshToken()
        } else {
          console.log('[Auth] Status check failed, redirecting to login...')
          clearAuthAndRedirect()
        }
      } catch (error) {
        console.error('[Auth] Failed to check auth status:', error)
        clearAuthAndRedirect()
      }
    }

    const tryRefreshToken = async () => {
      try {
        const storedUser = localStorage.getItem(`${STORAGE_PREFIX}_user`)
        if (!storedUser) {
          clearAuthAndRedirect()
          return
        }

        const userData = JSON.parse(storedUser)
        if (!userData.id) {
          clearAuthAndRedirect()
          return
        }

        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Cookie vai automaticamente
          body: JSON.stringify({ user_id: userData.id }),
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          console.log('[Auth] Token refreshed successfully')

          // Update localStorage (user only, token is in cookie)
          localStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(refreshData.user))

          setUser(refreshData.user)
          setIsLoading(false)
        } else {
          console.log('[Auth] Refresh failed, redirecting to login...')
          clearAuthAndRedirect()
        }
      } catch (error) {
        console.error('[Auth] Refresh error:', error)
        clearAuthAndRedirect()
      }
    }

    const clearAuthAndRedirect = () => {
      localStorage.removeItem(`${STORAGE_PREFIX}_user`)
      window.location.href = `${API_URL}/api/auth/login`
    }

    checkAuth()
  }, [])

  // Redirect to login
  const login = () => {
    console.log('[Auth] Redirecting to login...')
    window.location.href = `${API_URL}/api/auth/login`
  }

  // Logout
  const logout = async () => {
    try {
      console.log('[Auth] Logging out...')

      if (user?.id) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Cookie vai automaticamente
          body: JSON.stringify({ user_id: user.id }),
        })
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error)
    } finally {
      // Clear localStorage (cookie is cleared by backend)
      localStorage.removeItem(`${STORAGE_PREFIX}_user`)
      setUser(null)
      // Redirect to login
      window.location.href = `${API_URL}/api/auth/login`
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
