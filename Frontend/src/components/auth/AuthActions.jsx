import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Presentation, ShieldCheck } from 'lucide-react'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { googleLoginUrl } from '@/lib/services/auth'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { retryAuthConfig, useAuthConfig, withColdStartRetry } from '@/lib/useAuthConfig'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function GoogleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.51 5.51 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.87-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.36 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.34a12 12 0 0 0 0 10.78l4.02-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.34 6.61L5.36 9.7A7.2 7.2 0 0 1 12 4.75Z" />
    </svg>
  )
}

/**
 * Sign-in actions shared by the landing page and /login:
 * "Try as student" / "Try as instructor" (only when the backend reports demo_mode) + "Sign in with Google".
 * `size` - 'md' | 'lg'.  `align` - 'start' | 'center' (row layout) ; `stacked` - full-width column.
 */
export function AuthActions({ size = 'lg', stacked = false, className, showGoogle = true }) {
  const { demo_mode, google_login, waking: configWaking, failed } = useAuthConfig()
  const { loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)
  const [loginWaking, setLoginWaking] = useState(false)
  const waking = configWaking || loginWaking

  const tryDemo = async (role) => {
    setPending(role)
    try {
      const me = await withColdStartRetry(() => loginAsDemo(role), { onWaiting: setLoginWaking })
      navigate(homeForRole(me.role), { replace: true })
    } catch (err) {
      toast.error('Demo sign-in failed', { description: getErrorMessage(err) })
      setPending(null)
      setLoginWaking(false)
    }
  }

  const google = showGoogle && google_login !== false

  // While the free-tier API wakes up the demo buttons are shown disabled (with a spinner) instead of vanishing.
  const showDemo = demo_mode || configWaking || failed

  return (
    <div className={cn('flex gap-3', stacked ? 'flex-col' : 'flex-col sm:flex-row sm:flex-wrap', className)}>
      {showDemo && (
        <>
          <Button size={size} loading={pending === 'student' || configWaking} disabled={!!pending || !demo_mode} onClick={() => tryDemo('student')}>
            <GraduationCap className="size-5" aria-hidden="true" />
            Try as student
          </Button>
          <Button size={size} variant="secondary" loading={pending === 'instructor' || configWaking} disabled={!!pending || !demo_mode} onClick={() => tryDemo('instructor')}>
            <Presentation className="size-5" aria-hidden="true" />
            Try as instructor
          </Button>
          <Button size={size} variant="secondary" loading={pending === 'admin' || configWaking} disabled={!!pending || !demo_mode} onClick={() => tryDemo('admin')}>
            <ShieldCheck className="size-5" aria-hidden="true" />
            Try as admin
          </Button>
        </>
      )}
      {(waking || failed) && (
        <p className="flex w-full basis-full items-start gap-2 text-sm text-muted">
          {waking ? (
            <>
              <Spinner label="Waking up the demo server" className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-medium">Waking up the demo server…</strong> this can take up to a minute on the free tier.
                {configWaking ? ' Retrying automatically.' : ' Signing you in as soon as it is ready.'}
              </span>
            </>
          ) : (
            <span>
              The demo server did not respond.{' '}
              <button type="button" className="font-medium underline" onClick={retryAuthConfig}>Try again</button>
            </span>
          )}
        </p>
      )}
      {google && (
        <Button size={size} variant="outline" href={googleLoginUrl()} disabled={!!pending}>
          <GoogleIcon />
          Sign in with Google
        </Button>
      )}
    </div>
  )
}
