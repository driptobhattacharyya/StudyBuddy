import { Link, Navigate, useLocation } from 'react-router-dom'
import { BookOpen, Code2, Layers, MessagesSquare, Sparkles } from 'lucide-react'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { useAuthConfig } from '@/lib/useAuthConfig'
import { AuthActions } from '@/components/auth/AuthActions'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const POINTS = [
  { icon: Sparkles, text: 'AI summaries and practice questions from your notes' },
  { icon: Code2, text: 'Run code in the browser with Socratic hints' },
  { icon: Layers, text: 'Flashcards generated from your course material' },
  { icon: MessagesSquare, text: 'Chat with answers grounded in your course' },
]

export default function Login() {
  const { status, user } = useAuth()
  const { demo_mode } = useAuthConfig()
  const location = useLocation()
  if (status === 'authenticated') return <Navigate to={location.state?.from ?? homeForRole(user.role)} replace />

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <Logo className="[&_span]:text-white" />
        </div>
        <div className="relative">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Learn faster with an AI study buddy that knows your course.</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/15"><Icon className="size-[18px]" aria-hidden="true" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-white/70"><BookOpen className="size-4" aria-hidden="true" /> IIT Madras BS Software Engineering - Team 22</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link to="/" className="lg:invisible" aria-label="Back to home"><Logo /></Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-8">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-muted">Sign in to continue learning{demo_mode ? ', or explore the live demo with no account.' : '.'}</p>
            <AuthActions stacked className="mt-8" />
            {location.state?.from && <p className="mt-6 text-xs text-subtle">You will be taken back to where you were after signing in.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
