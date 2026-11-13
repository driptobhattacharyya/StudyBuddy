import { useEffect, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Cpu, Eye, Gauge, X } from 'lucide-react'
import { getTrace } from '@/lib/services/ai'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-fg">{value ?? '-'}</p>
    </div>
  )
}

function Block({ title, children }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-sm font-semibold text-fg">{title}</h3>
      {children}
    </section>
  )
}

const pre = 'max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed text-muted'

function TraceBody({ traceId }) {
  const [state, setState] = useState({ loading: true, trace: null, error: null })

  useEffect(() => {
    let alive = true
    getTrace(traceId)
      .then((trace) => alive && setState({ loading: false, trace, error: null }))
      .catch((e) => alive && setState({ loading: false, trace: null, error: getErrorMessage(e) }))
    return () => {
      alive = false
    }
  }, [traceId])

  const { loading, trace, error } = state
  if (loading) return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-32" /><Skeleton className="h-24" /></div>
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>

  const retrieved = trace.retrieved ?? []
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Model" value={trace.model} />
        <Stat label="Latency" value={trace.latency_ms != null ? `${Math.round(trace.latency_ms)} ms` : null} />
        <Stat label="Tokens in" value={trace.tokens_in} />
        <Stat label="Tokens out" value={trace.tokens_out} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {trace.feature && <Badge variant="brand">{trace.feature}</Badge>}
        {trace.provider && <Badge>{trace.provider}</Badge>}
        {trace.status && <Badge variant={trace.status === 'ok' || trace.status === 'success' ? 'success' : 'danger'}>{trace.status}</Badge>}
      </div>
      {trace.error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{trace.error}</p>}
      {trace.system_prompt && <Block title="System prompt"><pre className={pre}>{trace.system_prompt}</pre></Block>}
      <Block title="Prompt sent to the model"><pre className={pre}>{trace.prompt || '(not recorded)'}</pre></Block>
      <Block title={`Retrieved passages (${retrieved.length})`}>
        {retrieved.length === 0 ? (
          <p className="text-sm text-muted">No course material was retrieved for this answer.</p>
        ) : (
          <ul className="space-y-2">
            {retrieved.map((r, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-fg">{r.title}</span>
                  {r.week != null && <Badge>Week {r.week}</Badge>}
                  {r.score != null && <Badge variant="brand">score {Number(r.score).toFixed(2)}</Badge>}
                </div>
                {r.snippet && <p className="mt-1.5 text-sm text-muted">{r.snippet}</p>}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  )
}

/**
 * <UnderTheHood traceId={meta?.trace_id} />  - a small "Under the hood" button that opens a side drawer
 * with the prompt, retrieved passages, model, tokens and latency for an AI answer
 * (GET /ai/trace/{id}; owner or admin only). Renders nothing without a traceId.
 * Use `open`/`onOpenChange` for controlled use, or `label` to change the button text.
 */
export function UnderTheHood({ traceId, label = 'Under the hood', iconOnly = false, className, open, onOpenChange }) {
  if (!traceId) return null
  const button = (
    <RadixDialog.Trigger asChild>
      <button
        aria-label="Under the hood: how this answer was produced"
        className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-subtle transition-colors hover:bg-surface-2 hover:text-brand-600 dark:hover:text-brand-300', className)}
      >
        <Eye className="size-3.5" aria-hidden="true" />
        {!iconOnly && label}
      </button>
    </RadixDialog.Trigger>
  )
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {iconOnly ? <Tooltip content={label}>{button}</Tooltip> : button}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/50 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-pop focus:outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <RadixDialog.Title className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Cpu className="size-5 text-brand-500" aria-hidden="true" /> Under the hood
              </RadixDialog.Title>
              <RadixDialog.Description className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Gauge className="size-3.5" aria-hidden="true" /> Exactly what was sent to the model for this answer.
              </RadixDialog.Description>
            </div>
            <RadixDialog.Close aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5 pt-4">
            <TraceBody traceId={traceId} />
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
