import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL
const STORAGE_PREFIX = import.meta.env.VITE_STORAGE_PREFIX || 'myapp'

/**
 * AuthCallback - Handles OAuth callback from Auth service
 *
 * This page receives the authorization code from Auth, exchanges it
 * for an access token via the backend. The token is stored in an
 * httpOnly cookie (by the backend) for XSS protection.
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error')

      if (errorParam) {
        console.error('[AuthCallback] OAuth error:', errorParam)

        // Show user-friendly message for session expired
        if (errorParam === 'session_expired') {
          const description = params.get('error_description') || 'Your session has expired.'
          console.log('[AuthCallback] Session expired, redirecting to login...')
          setError(description)
        } else {
          setError(errorParam)
        }

        // Redirect immediately for session expired (user expects this)
        const delay = errorParam === 'session_expired' ? 500 : 2000
        setTimeout(() => {
          window.location.href = `${API_URL}/api/auth/login`
        }, delay)
        return
      }

      if (!code) {
        console.log('[AuthCallback] No code received, redirecting to login...')
        window.location.href = `${API_URL}/api/auth/login`
        return
      }

      try {
        console.log('[AuthCallback] Exchanging code for token...')

        const response = await fetch(`${API_URL}/api/auth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Cookie é setado automaticamente pelo backend
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Authentication failed')
        }

        const data = await response.json()
        console.log('[AuthCallback] Authentication successful')

        // Store user in localStorage (token is in httpOnly cookie)
        localStorage.setItem(`${STORAGE_PREFIX}_user`, JSON.stringify(data.user))

        // Navigate to dashboard
        navigate('/', { replace: true })
      } catch (err) {
        console.error('[AuthCallback] Error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setTimeout(() => {
          window.location.href = `${API_URL}/api/auth/login`
        }, 2000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ color: '#ef4444', marginBottom: '16px' }}>
              {error}
            </div>
            <p style={{ color: '#6b7280' }}>Redirecting to login...</p>
          </>
        ) : (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#6b7280' }}>Authenticating...</p>
          </>
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
