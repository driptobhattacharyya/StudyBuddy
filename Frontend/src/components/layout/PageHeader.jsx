import { cn } from '@/lib/cn'

/** Standard page title block. <PageHeader title="Notes" description="..." actions={<Button/>} /> */
export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Centered max-width content wrapper used by pages inside the shells. */
export function PageContainer({ className, wide, ...props }) {
  return <div className={cn('mx-auto w-full p-4 sm:p-6 lg:p-8', wide ? 'max-w-7xl' : 'max-w-6xl', className)} {...props} />
}
