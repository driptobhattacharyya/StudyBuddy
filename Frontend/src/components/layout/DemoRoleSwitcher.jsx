import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, FlaskConical, GraduationCap, Presentation, ShieldCheck } from 'lucide-react'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { useAuthConfig } from '@/lib/useAuthConfig'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { Spinner } from '@/components/ui/Spinner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'

const ROLES = [
  { role: 'student', label: 'Student', icon: GraduationCap },
  { role: 'instructor', label: 'Instructor', icon: Presentation },
  { role: 'admin', label: 'Admin', icon: ShieldCheck },
]

/** Top-bar switcher between the three seeded demo accounts. Renders only when the backend is in demo mode. */
export function DemoRoleSwitcher() {
  const { demo_mode } = useAuthConfig()
  const { role, loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)
  if (!demo_mode) return null

  const current = ROLES.find((r) => r.role === role) ?? ROLES[0]
  const switchTo = async (next) => {
    if (next === role) return
    setPending(next)
    try {
      const me = await loginAsDemo(next)
      navigate(homeForRole(me.role))
    } catch (err) {
      toast.error('Could not switch role', { description: getErrorMessage(err) })
    } finally {
      setPending(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch demo role"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-amber-400/70 bg-amber-50 px-2.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
        >
          {pending ? <Spinner className="size-3.5" /> : <FlaskConical className="size-3.5" aria-hidden="true" />}
          <span className="hidden sm:inline">Demo:</span>
          <span>{current.label}</span>
          <ChevronDown className="size-3 opacity-70" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>View the demo as...</DropdownMenuLabel>
        {ROLES.map(({ role: r, label, icon }) => (
          <DropdownMenuItem key={r} icon={icon} onSelect={() => switchTo(r)}>
            <span className="flex-1">{label}</span>
            {r === role && <Check className="size-4 text-brand-500" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
