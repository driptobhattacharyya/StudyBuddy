import { cn } from '@/lib/cn'

/** Brand mark + wordmark. */
export function Logo({ className, showText = true, size = 'md' }) {
  const box = size === 'lg' ? 'size-10' : 'size-8'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={cn('flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-sm shadow-brand-600/30', box)}>
        <svg viewBox="0 0 24 24" className="size-[60%] text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 6.5A1.5 1.5 0 0 1 3.5 5H10a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3.5A1.5 1.5 0 0 1 2 15.5v-9Z" />
          <path d="M22 6.5A1.5 1.5 0 0 0 20.5 5H14a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6.5a1.5 1.5 0 0 0 1.5-1.5v-9Z" />
        </svg>
      </span>
      {showText && <span className={cn('font-semibold tracking-tight text-fg', size === 'lg' ? 'text-xl' : 'text-[17px]')}>Study Buddy</span>}
    </span>
  )
}
