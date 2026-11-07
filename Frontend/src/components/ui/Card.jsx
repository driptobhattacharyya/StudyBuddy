import { cn } from '@/lib/cn'

export function Card({ className, interactive, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        interactive && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop dark:hover:border-brand-700',
        className,
      )}
      {...props}
    />
  )
}
export const CardHeader = ({ className, ...props }) => <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
export const CardTitle = ({ className, as: Tag = 'h3', ...props }) => (
  <Tag className={cn('text-base font-semibold tracking-tight text-fg', className)} {...props} />
)
export const CardDescription = ({ className, ...props }) => <p className={cn('text-sm text-muted', className)} {...props} />
export const CardContent = ({ className, ...props }) => <div className={cn('p-5 pt-2', className)} {...props} />
export const CardFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center gap-2 border-t border-border p-4', className)} {...props} />
)
