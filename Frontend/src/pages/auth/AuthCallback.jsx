import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

/** OAuth landing: backend redirects to /auth/callback#token=<jwt>. Store it, strip the hash, load /auth/me, route by role. */
export default function AuthCallback() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = params.get('token')
    // Remove the token from the address bar / history immediately.
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      Promise.resolve().then(() => setFailed(true))
      return
    }
    loginWithToken(token)
      .then((me) => navigate(homeForRole(me.role), { replace: true }))
      .catch(() => setFailed(true))
  }, [loginWithToken, navigate])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <Logo size="lg" />
      {failed ? (
        <>
          <p className="text-lg font-medium">We could not sign you in</p>
          <p className="max-w-sm text-sm text-muted">The sign-in link was missing or has expired. Please try again.</p>
          <Button to="/login">Back to sign in</Button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-muted"><Spinner /> Signing you in...</p>
      )}
    </div>
  )
}
