/**
 * AI call log - ported. Endpoints: admin.getAILogs (GET /admin/ai/logs?limit=N); clicking a row opens
 * <UnderTheHood traceId/> (GET /ai/trace/{id}) in its drawer.
 * Assumed response: an array of ai_logs docs { _id, trace_id?, user, feature, provider, model, tokens_in, tokens_out,
 *   latency_ms, status, error?, created_at } (also accepts { logs: [...] }). The feature filter is applied client-side.
 */
import { useEffect, useMemo, useState } from 'react'
import { ScrollText } from 'lucide-react'
import { getAILogs } from '@/lib/services/admin'
import { getErrorMessage } from '@/lib/api'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { UnderTheHood } from '@/components/ai'

const LIMITS = [25, 50, 100]
const whole = new Intl.NumberFormat()

const listOf = (data) => (Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : [])
const str = (v, fallback = '-') => (v == null || v === '' ? fallback : String(v))

const normalise = (l, i) => {
  const user = typeof l?.user === 'object' && l.user ? l.user.email ?? l.user.name : l?.user
  return {
    key: String(l?._id ?? l?.trace_id ?? i),
    trace: l?.trace_id ?? l?._id ?? null,
    created: l?.created_at ?? null,
    user: str(user),
    feature: str(l?.feature, 'unknown'),
    model: str(l?.model),
    tokens_in: Number(l?.tokens_in) || 0,
    tokens_out: Number(l?.tokens_out) || 0,
    latency: Number(l?.latency_ms) || 0,
    status: str(l?.status, 'unknown').toLowerCase(),
    error: l?.error ?? null,
  }
}

const statusVariant = (s) => {
  if (s === 'ok' || s === 'success') return 'success'
  if (/err|fail|timeout|denied|429|5\d\d/.test(s)) return 'danger'
  return 'warning'
}

const formatTime = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

export default function AdminLogs() {
  const [limit, setLimit] = useState(50)
  const [feature, setFeature] = useState('all')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null) // normalised log row whose trace is open
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getAILogs(limit)
      .then((data) => alive && setLogs(listOf(data).map(normalise)))
      .catch((e) => alive && setError(getErrorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [limit, attempt])

  const features = useMemo(() => [...new Set(logs.map((l) => l.feature))].sort(), [logs])
  const visible = useMemo(() => (feature === 'all' ? logs : logs.filter((l) => l.feature === feature)), [logs, feature])

  return (
    <PageContainer>
      <PageHeader
        title="AI call log"
        description="Recent AI calls with prompts and retrieved context. Select a call to see what was sent to the model."
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <Select
          aria-label="Filter by feature"
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          disabled={loading || !!error}
          className="h-9 w-full text-sm sm:w-56"
          wrapperClassName="w-full sm:w-56"
        >
          <option value="all">All features</option>
          {features.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Number of calls to load"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-9 w-full text-sm sm:w-40"
          wrapperClassName="w-full sm:w-40"
        >
          {LIMITS.map((n) => (
            <option key={n} value={n}>
              Last {n} calls
            </option>
          ))}
        </Select>
        {!loading && !error && (
          <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
            Showing {whole.format(visible.length)} of {whole.format(logs.length)}
          </p>
        )}
      </Card>

      {error ? (
        <Card className="p-5">
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </Card>
      ) : loading ? (
        <Card className="space-y-3 p-5" role="status" aria-label="Loading AI calls">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No AI calls yet" description="Calls will be logged here as people use the AI features." />
      ) : visible.length === 0 ? (
        <EmptyState icon={ScrollText} title="No calls for this feature" description="Choose a different feature or load more calls." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Recent AI calls. Select a row to view its trace.</caption>
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Time</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">User</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Feature</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Model</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Tokens in / out</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Latency</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((l) => (
                  <tr
                    key={l.key}
                    onClick={() => l.trace && setSelected(l)}
                    className={`transition-colors ${l.trace ? 'cursor-pointer hover:bg-surface-2/60' : ''}`}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                      {l.trace ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(l)
                          }}
                          className="rounded text-left text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-brand-300"
                          aria-label={`Open trace for ${l.feature} call at ${formatTime(l.created)}`}
                        >
                          {formatTime(l.created)}
                        </button>
                      ) : (
                        formatTime(l.created)
                      )}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5">{l.user}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="brand">{l.feature}</Badge>
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-2.5 font-mono text-xs">{l.model}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {whole.format(l.tokens_in)} / {whole.format(l.tokens_out)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{l.latency ? `${Math.round(l.latency)} ms` : '-'}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                      {l.error && <span className="sr-only">: {str(l.error)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer host: the trigger is hidden; the drawer is opened by selecting a row. */}
      <UnderTheHood
        traceId={selected?.trace ?? undefined}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        label="Under the hood"
        className="hidden"
      />
    </PageContainer>
  )
}
