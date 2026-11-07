import { cn } from '@/lib/cn'

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const variants = {
  primary:
    'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-600/30 hover:from-brand-500 hover:to-brand-700 dark:shadow-brand-900/40',
  secondary: 'bg-surface-2 text-fg hover:bg-border border border-transparent',
  outline: 'border border-border-strong bg-surface text-fg hover:bg-surface-2 shadow-sm',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  link: 'text-brand-600 dark:text-brand-400 underline-offset-4 hover:underline px-0',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9',
}

/** Class string for anything that should look like a Button (e.g. a router <Link>). */
export function buttonVariants({ variant = 'primary', size = 'md', className } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}
