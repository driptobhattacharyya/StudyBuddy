import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { CoursesProvider, useCourses } from '@/context/CoursesContext'
import { LAST_COURSE_KEY } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { SHELLS } from './navConfig'
import { CourseSwitcher } from './CourseSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { DemoRoleSwitcher } from './DemoRoleSwitcher'
import { AIModeBadge } from './AIModeBadge'

const COLLAPSE_KEY = 'sb_sidebar_collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function useActiveCourseId() {
  const { courseId, myCourses } = useCourses()
  if (courseId) return courseId
  let last = null
  try {
    last = localStorage.getItem(LAST_COURSE_KEY)
  } catch {
    /* ignore */
  }
  if (last && myCourses.some((c) => c.course_id === last)) return last
  return myCourses[0]?.course_id ?? null
}

function NavItems({ shell, collapsed, onNavigate }) {
  const config = SHELLS[shell]
  const activeCourse = useActiveCourseId()
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {config.items.map((item) => {
        const disabled = item.course && !activeCourse
        const Icon = item.icon
        const link = (
          <NavLink
            to={disabled ? '#' : item.to(activeCourse)}
            end={item.end}
            onClick={(e) => (disabled ? e.preventDefault() : onNavigate?.())}
            aria-disabled={disabled || undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive && !disabled
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-muted hover:bg-surface-2 hover:text-fg',
                disabled && 'pointer-events-none opacity-40',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
          </NavLink>
        )
        return collapsed ? (
          <Tooltip key={item.key} content={item.label} side="right">
            {link}
          </Tooltip>
        ) : (
          <div key={item.key}>{link}</div>
        )
      })}
    </nav>
  )
}

function SidebarBrand({ shell, collapsed }) {
  return (
    <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed && 'justify-center px-0')}>
      <NavLink to={SHELLS[shell].base} aria-label="Study Buddy home" className="rounded-lg">
        <Logo showText={!collapsed} />
      </NavLink>
    </div>
  )
}

/**
 * Layout route for authenticated areas. `shell` is 'student' | 'instructor'.
 * Renders: collapsible sidebar (drawer on mobile) + top bar (course switcher, theme, user) + <Outlet/>.
 */
export function AppShell({ shell }) {
  const config = SHELLS[shell]
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [drawer, setDrawer] = useState(false)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <CoursesProvider>
      <a
        href="#main"
        className="sr-only z-[200] rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex',
            collapsed ? 'w-[72px]' : 'w-64',
          )}
        >
          <SidebarBrand shell={shell} collapsed={collapsed} />
          <div className="flex-1 overflow-y-auto p-3">
            <NavItems shell={shell} collapsed={collapsed} />
          </div>
          <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center')}>
            {!collapsed && (
              <Badge variant="brand" className="mb-3 ml-1">
                {config.label} workspace
              </Badge>
            )}
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'sm'}
              className={cn(!collapsed && 'w-full justify-start')}
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
              {!collapsed && 'Collapse'}
            </Button>
          </div>
        </aside>

        {/* Mobile drawer */}
        <Dialog.Root open={drawer} onOpenChange={setDrawer}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/50 backdrop-blur-sm lg:hidden" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] animate-slide-in-left flex-col bg-surface shadow-pop focus:outline-none lg:hidden"
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Logo />
                <Dialog.Close aria-label="Close navigation" className="rounded-md p-1.5 text-muted hover:bg-surface-2">
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavItems shell={shell} onNavigate={() => setDrawer(false)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
            {!config.noCourses && <CourseSwitcher base={config.base} />}
            <div className="flex-1" />
            <AIModeBadge />
            <DemoRoleSwitcher />
            <ThemeToggle />
            <UserMenu />
          </header>
          <main id="main" className="min-w-0 flex-1">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </CoursesProvider>
  )
}
