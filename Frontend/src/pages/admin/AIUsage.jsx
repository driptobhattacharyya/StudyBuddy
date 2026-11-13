/**
 * AI usage - ported. Endpoint: admin.getAIUsage (GET /admin/ai/usage?days=N).
 * Assumed response: { per_day: [{ date, requests, tokens_in, tokens_out, avg_latency_ms, errors, est_cost }],
 *   per_feature: [{ feature, requests, ... }], totals?: { ... } }. Also accepts a bare array for per_day.
 * Missing fields are treated as 0 and totals are derived from the rows when not supplied.
 */
import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Clock, Coins } from 'lucide-react'
import { getAIUsage } from '@/lib/services/admin'
import { getErrorMessage } from '@/lib/api'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const RANGES = [7, 14, 30]
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat()

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
const normaliseRow = (r, labelKey) => ({
  label: labelKey === 'feature' ? String(r?.feature ?? r?.name ?? 'unknown') : String(r?.date ?? r?.day ?? '').slice(5),
  date: String(r?.date ?? r?.day ?? ''),
  requests: num(r?.requests),
  tokens_in: num(r?.tokens_in),
  tokens_out: num(r?.tokens_out),
  latency: num(r?.avg_latency_ms ?? r?.latency_ms),
  errors: num(r?.errors),
  cost: num(r?.est_cost ?? r?.cost),
})
const rowsOf = (usage, key) => {
  if (key === 'per_day' && Array.isArray(usage)) return usage
  return Array.isArray(usage?.[key]) ? usage[key] : []
}
const money = (n) => `$${n < 1 ? n.toFixed(3) : n.toFixed(2)}`
const ms = (n) => (n ? `${Math.round(n)} ms` : '-')

// Request-weighted average latency across rows.
const weightedLatency = (rows) => {
  const reqs = rows.reduce((s, r) => s + r.requests, 0)
  if (!reqs) return 0
  return rows.reduce((s, r) => s + r.latency * r.requests, 0) / reqs
}

function Tile({ icon: Icon, label, value, loading }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {loading ? <Skeleton className="h-6 w-16" /> : <p className="truncate text-xl font-semibold tracking-tight tabular-nums">{value}</p>}
        <p className="text-xs text-muted sm:text-sm">{label}</p>
      </div>
    </Card>
  )
}

function DayChart({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.requests))
  // Show roughly 7 date labels regardless of range.
  const every = Math.max(1, Math.ceil(rows.length / 7))
  return (
    <div className="flex h-48 items-end gap-1 sm:gap-1.5" role="list" aria-label="Requests per day">
      {rows.map((r, i) => (
        <div key={`${r.date}-${i}`} role="listitem" className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
          <div
            className="w-full rounded-t bg-gradient-to-t from-brand-500 to-accent-500 transition-[height] duration-300"
            style={{ height: `${(r.requests / max) * 100}%`, minHeight: r.requests ? 3 : 0 }}
            title={`${r.date || r.label}: ${whole.format(r.requests)} requests`}
          />
          <span className="h-4 truncate text-center text-[10px] text-subtle" aria-hidden="true">
            {i % every === 0 ? r.label : ''}
          </span>
          <span className="sr-only">{`${r.date || r.label}: ${whole.format(r.requests)} requests`}</span>
        </div>
      ))}
    </div>
  )
}

function FeatureBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.requests))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,6.5rem)_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate text-muted" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(r.requests / max) * 100}%` }} />
          </span>
          <span className="text-right font-medium tabular-nums">{whole.format(r.requests)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AIUsage() {
  const [days, setDays] = useState(7)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getAIUsage(days)
      .then((d) => alive && setUsage(d))
      .catch((e) => alive && setError(getErrorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [days])

  const perDay = useMemo(() => rowsOf(usage, 'per_day').map((r) => normaliseRow(r, 'date')), [usage])
  const perFeature = useMemo(() => rowsOf(usage, 'per_feature').map((r) => normaliseRow(r, 'feature')), [usage])

  // Prefer server totals; otherwise derive them from the rows.
  const totals = useMemo(() => {
    const src = perDay.length ? perDay : perFeature
    const t = usage?.totals ?? usage?.total
    const sum = (k) => src.reduce((s, r) => s + r[k], 0)
    return {
      requests: num(t?.requests) || sum('requests'),
      tokens_in: num(t?.tokens_in) || sum('tokens_in'),
      tokens_out: num(t?.tokens_out) || sum('tokens_out'),
      latency: num(t?.avg_latency_ms ?? t?.latency_ms) || weightedLatency(src),
      errors: num(t?.errors) || sum('errors'),
      cost: num(t?.est_cost ?? t?.cost) || sum('cost'),
    }
  }, [usage, perDay, perFeature])

  const hasData = perDay.length > 0 || perFeature.length > 0 || totals.requests > 0

  return (
    <PageContainer>
      <PageHeader
        title="AI usage"
        description="Requests, tokens, latency and cost by day and feature."
        actions={
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {RANGES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === d ? 'bg-brand-600 text-white shadow-sm' : 'text-muted hover:text-fg'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Tile loading={loading} icon={Activity} label="Requests" value={whole.format(totals.requests)} />
        <Tile loading={loading} icon={ArrowDownToLine} label="Tokens in" value={compact.format(totals.tokens_in)} />
        <Tile loading={loading} icon={ArrowUpFromLine} label="Tokens out" value={compact.format(totals.tokens_out)} />
        <Tile loading={loading} icon={Clock} label="Avg latency" value={ms(totals.latency)} />
        <Tile loading={loading} icon={AlertTriangle} label="Errors" value={whole.format(totals.errors)} />
        <Tile loading={loading} icon={Coins} label="Est. cost" value={money(totals.cost)} />
      </div>

      {!loading && !error && !hasData ? (
        <EmptyState icon={Activity} title="No AI usage in this period" description="Requests will appear here once people use the AI features." />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests per day</CardTitle>
                <CardDescription>Last {days} days</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48" /> : perDay.length ? <DayChart rows={perDay} /> : <p className="py-8 text-center text-sm text-muted">No daily data.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Requests by feature</CardTitle>
                <CardDescription>Summaries, chat, hints, flashcards and more</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48" /> : perFeature.length ? <FeatureBars rows={perFeature} /> : <p className="py-8 text-center text-sm text-muted">No feature data.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage by feature</CardTitle>
              <CardDescription>Per-feature totals for the selected range</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              {loading ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : perFeature.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">AI usage per feature</caption>
                    <thead className="bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                      <tr>
                        <th scope="col" className="px-5 py-2.5 font-medium">Feature</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Requests</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Tokens in</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Tokens out</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Avg latency</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium">Errors</th>
                        <th scope="col" className="px-5 py-2.5 text-right font-medium">Est. cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {perFeature.map((r) => (
                        <tr key={r.label} className="hover:bg-surface-2/60">
                          <td className="px-5 py-2.5 font-medium text-fg">{r.label}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{whole.format(r.requests)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{whole.format(r.tokens_in)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{whole.format(r.tokens_out)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{ms(r.latency)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{whole.format(r.errors)}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{money(r.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 pb-5 text-sm text-muted">No feature data for this range.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  )
}
