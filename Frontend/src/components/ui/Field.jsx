import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg shadow-sm placeholder:text-subtle ' +
  'transition-colors focus-visible:border-brand-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-500'

/** Label + control + hint/error wrapper. Wire `id` into the control for accessible labelling. */
export function Field({ label, hint, error, id, className, children, required }) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-fg">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      {typeof children === 'function' ? children({ id: fieldId, 'aria-invalid': !!error, 'aria-describedby': `${fieldId}-desc` }) : children}
      {(error || hint) && (
        <p id={`${fieldId}-desc`} className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-muted')}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

/** <Input label="Email" hint="..." error="..." /> - or use bare (pass aria-label). */
export const Input = forwardRef(function Input({ label, hint, error, id, className, wrapperClassName, required, ...props }, ref) {
  const auto = useId()
  const fieldId = id ?? auto
  const el = (
    <input
      ref={ref}
      id={fieldId}
      required={required}
      aria-invalid={!!error || undefined}
      aria-describedby={error || hint ? `${fieldId}-desc` : undefined}
      className={cn(control, 'h-10', className)}
      {...props}
    />
  )
  if (!label && !hint && !error) return el
  return (
    <Field label={label} hint={hint} error={error} id={fieldId} required={required} className={wrapperClassName}>
      {el}
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, hint, error, id, className, wrapperClassName, required, rows = 4, ...props }, ref) {
  const auto = useId()
  const fieldId = id ?? auto
  const el = (
    <textarea
      ref={ref}
      id={fieldId}
      rows={rows}
      required={required}
      aria-invalid={!!error || undefined}
      aria-describedby={error || hint ? `${fieldId}-desc` : undefined}
      className={cn(control, 'min-h-20 resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  )
  if (!label && !hint && !error) return el
  return (
    <Field label={label} hint={hint} error={error} id={fieldId} required={required} className={wrapperClassName}>
      {el}
    </Field>
  )
})

/** Native <select> with consistent styling. Children are <option>s. */
export const Select = forwardRef(function Select({ label, hint, error, id, className, wrapperClassName, required, children, ...props }, ref) {
  const auto = useId()
  const fieldId = id ?? auto
  const el = (
    <div className="relative">
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={!!error || undefined}
        className={cn(control, 'h-10 appearance-none pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  )
  if (!label && !hint && !error) return el
  return (
    <Field label={label} hint={hint} error={error} id={fieldId} required={required} className={wrapperClassName}>
      {el}
    </Field>
  )
})
