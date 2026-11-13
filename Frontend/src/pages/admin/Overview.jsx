/**
 * Admin overview - ported. Endpoints: admin.getStats (GET /admin/stats), admin.getAIUsage (GET /admin/ai/usage?days=7),
 * admin.resetDemo (POST /admin/demo/reset, demo mode only).
 */
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ClipboardList, FlaskConical, Send, Users } from 'lucide-react'
import { getAIUsage, getStats, resetDemo } from '@/lib/services/admin'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useAuthConfig } from '@/lib/useAuthConfig'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

function Stat({ icon: Icon, label, value, loading }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-semibold tracking-tight">{value ?? '-'}</p>}
        <p className="text-sm text-muted">{label}</p>
      </div>
    </Card>
  )
}

// Accepts either an array of rows or { per_day: [...], per_feature: [...] }.
const rowsOf = (usage, key) => (Array.isArray(usage) ? (key === 'per_day' ? usage : []) : (usage?.[key] ?? []))

function Bars({ rows, labelKey, valueKey }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const v = Number(r[valueKey]) || 0
        return (
          <li key={r[labelKey]} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
            <span className="truncate text-muted">{r[labelKey]}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums">{v}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function AdminOverview() {
  const { demo_mode } = useAuthConfig()
  const [stats, setStats] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, u] = await Promise.allSettled([getStats(), getAIUsage(7)])
    setStats(s.status === 'fulfilled' ? s.value : null)
    setUsage(u.status === 'fulfilled' ? u.value : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reset = async () => {
    setResetting(true)
    try {
      await resetDemo()
      toast.success('Demo data reset')
      load()
    } catch (e) {
      toast.error('Reset failed', { description: getErrorMessage(e) })
    } finally {
      setResetting(false)
    }
  }

  const perDay = rowsOf(usage, 'per_day').map((r) => ({ ...r, label: String(r.date ?? r.day ?? '').slice(5) }))
  const perFeature = rowsOf(usage, 'per_feature').map((r) => ({ ...r, label: r.feature ?? r.name }))

  return (
    <PageContainer>
      <PageHeader
        title="Admin overview"
        description="Platform health and AI usage at a glance."
        actions={
          demo_mode && (
            <Button variant="outline" size="sm" loading={resetting} onClick={reset}>
              <FlaskConical className="size-4" aria-hidden="true" /> Reset demo data
            </Button>
          )
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat loading={loading} icon={Users} label="Users" value={stats?.users} />
        <Stat loading={loading} icon={BookOpen} label="Courses" value={stats?.courses} />
        <Stat loading={loading} icon={ClipboardList} label="Assignments" value={stats?.assignments} />
        <Stat loading={loading} icon={Send} label="Submissions" value={stats?.submissions} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI requests per day</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-40" /> : perDay.length ? <Bars rows={perDay} labelKey="label" valueKey="requests" /> : <EmptyState title="No AI usage yet" description="Requests will appear here once people use the AI features." className="py-8" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Requests by feature</CardTitle>
            <CardDescription>Summaries, chat, hints, flashcards and more</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-40" /> : perFeature.length ? <Bars rows={perFeature} labelKey="label" valueKey="requests" /> : <EmptyState title="No data" className="py-8" />}</CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
