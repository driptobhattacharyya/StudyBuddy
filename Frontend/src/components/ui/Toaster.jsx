import { useEffect, useSyncExternalStore } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'
import { cn } from '@/lib/cn'

const icons = {
  success: { Icon: CheckCircle2, cls: 'text-emerald-500' },
  error: { Icon: XCircle, cls: 'text-red-500' },
  warning: { Icon: AlertTriangle, cls: 'text-amber-500' },
  info: { Icon: Info, cls: 'text-brand-500' },
}

function ToastItem({ toast }) {
  const { Icon, cls } = icons[toast.variant] ?? icons.info
  useEffect(() => {
    if (!toast.duration) return
    const t = setTimeout(() => dismissToast(toast.id), toast.duration)
    return () => clearTimeout(t)
  }, [toast.id, toast.duration])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', cls)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
      </div>
      <button
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded-md p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

/** Mount once near the app root. Fire toasts with `toast.success('Saved')` from '@/lib/toast'. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:w-96 sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
