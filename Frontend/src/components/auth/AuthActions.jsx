import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Presentation, ShieldCheck } from 'lucide-react'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { googleLoginUrl } from '@/lib/services/auth'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useAuthConfig } from '@/lib/useAuthConfig'
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
  const { demo_mode, google_login } = useAuthConfig()
  const { loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)

  const tryDemo = async (role) => {
    setPending(role)
    try {
      const me = await loginAsDemo(role)
      navigate(homeForRole(me.role), { replace: true })
    } catch (err) {
      toast.error('Demo sign-in failed', { description: getErrorMessage(err) })
      setPending(null)
    }
  }

  const google = showGoogle && google_login !== false

  return (
    <div className={cn('flex gap-3', stacked ? 'flex-col' : 'flex-col sm:flex-row sm:flex-wrap', className)}>
      {demo_mode && (
        <>
          <Button size={size} loading={pending === 'student'} disabled={!!pending} onClick={() => tryDemo('student')}>
            <GraduationCap className="size-5" aria-hidden="true" />
            Try as student
          </Button>
          <Button size={size} variant="secondary" loading={pending === 'instructor'} disabled={!!pending} onClick={() => tryDemo('instructor')}>
            <Presentation className="size-5" aria-hidden="true" />
            Try as instructor
          </Button>
          <Button size={size} variant="secondary" loading={pending === 'admin'} disabled={!!pending} onClick={() => tryDemo('admin')}>
            <ShieldCheck className="size-5" aria-hidden="true" />
            Try as admin
          </Button>
        </>
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
