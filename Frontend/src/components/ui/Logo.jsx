import { cn } from '@/lib/cn'

/** The mark: a laptop with a smiling study buddy on screen (inspired by the original team logo). */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="20" height="14" rx="2.2" />
      <path d="M3 24.5h26" />
      <path d="M4.5 24.5 6 20h20l1.5 4.5" />
      <circle cx="16" cy="11.8" r="2.6" />
      <path d="M11.5 20c.4-2.3 2.2-3.7 4.5-3.7s4.1 1.4 4.5 3.7" />
    </svg>
  )
}

/** Brand mark + wordmark. */
export function Logo({ className, showText = true, size = 'md' }) {
  const box = size === 'lg' ? 'size-10' : 'size-8'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className={cn('flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-sm shadow-brand-600/30', box)}>
        <LogoMark className="size-[68%] text-white" />
      </span>
      {showText && <span className={cn('font-semibold tracking-tight text-fg', size === 'lg' ? 'text-xl' : 'text-[17px]')}>Study Buddy</span>}
    </span>
  )
}
