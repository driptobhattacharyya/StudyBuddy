import { cn } from '@/lib/cn'

export function Spinner({ className, label = 'Loading' }) {
  return (
    <svg
      role="status"
      aria-label={label}
      className={cn('size-4 animate-spin text-current', className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
