import { useId, useState } from 'react'
import { Markdown } from '@/components/ai/Markdown'
import { Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

/** Markdown textarea with Write / Preview tabs on mobile and side-by-side live preview on wide containers. */
export function MarkdownEditor({ label, value, onChange, error, rows = 12, placeholder, required }) {
  const [tab, setTab] = useState('write')
  const id = useId()
  const tabBtn = (key, text) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors lg:hidden',
        tab === key ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-muted hover:bg-surface-2',
      )}
    >
      {text}
    </button>
  )
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
          <span className="ml-2 text-xs font-normal text-subtle">Markdown supported</span>
        </label>
        <div className="flex gap-1">{tabBtn('write', 'Write')}{tabBtn('preview', 'Preview')}</div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={cn(tab === 'preview' && 'hidden lg:block')}>
          <Textarea
            id={id}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            placeholder={placeholder}
            className="font-mono text-[13px]"
          />
        </div>
        <div
          aria-label="Preview"
          className={cn(
            'max-h-[28rem] min-h-32 overflow-auto rounded-lg border border-border bg-surface-2/50 p-3',
            tab === 'write' && 'hidden lg:block',
          )}
        >
          {value?.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-subtle">Live preview appears here.</p>}
        </div>
      </div>
    </div>
  )
}
