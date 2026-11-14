import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, Download, RefreshCw, Table2 } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { getCourseInsights, getGradebook } from '@/lib/services/assignments'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

const TYPE_LABEL = { AQ: 'Quiz', PA: 'Practice', GA: 'Graded', PPA: 'Code practice', GrPA: 'Code graded' }
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmt = (n) => (n == null ? '-' : `${Math.round(n * 10) / 10}`)
const tone = (n) => (n == null ? '' : n >= 75 ? 'text-emerald-700 dark:text-emerald-300' : n >= 40 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300')
const isMissing = (e) => [404, 405, 501].includes(e?.response?.status)

/** Tolerant normaliser: accepts the row list from GET /course/{id}/marks (or { marks | rows }). */
function buildGradebook(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.marks ?? raw?.rows ?? []
  const cols = new Map()
  const students = new Map()
  for (const r of rows) {
    const key = `${r.week}|${r.assgn_type}`
    if (!cols.has(key)) cols.set(key, { key, week: r.week, type: r.assgn_type })
    const sid = r.email ?? r.user_id
    if (!students.has(sid)) students.set(sid, { id: sid, name: r.name || r.email || sid, email: r.email, marks: {} })
    students.get(sid).marks[key] = Number(r.mark)
  }
  const columns = [...cols.values()].sort((a, b) => a.week - b.week || String(a.type).localeCompare(String(b.type)))
  const list = [...students.values()]
    .map((s) => ({ ...s, average: avg(Object.values(s.marks)) }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return { columns, students: list }
}

function toCsv(columns, students, courseId) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Name', 'Email', ...columns.map((c) => `Week ${c.week} ${TYPE_LABEL[c.type] ?? c.type}`), 'Average']
  const lines = students.map((s) => [s.name, s.email, ...columns.map((c) => s.marks[c.key] ?? ''), s.average == null ? '' : s.average.toFixed(1)])
  const csv = [head, ...lines].map((l) => l.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${courseId}-gradebook.csv` })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function GradeTable({ columns, students }) {
  const colAvg = columns.map((c) => avg(students.map((s) => s.marks[c.key]).filter((v) => v != null)))
  const overall = avg(students.map((s) => s.average).filter((v) => v != null))
  const th = 'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted'
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">Student marks per week and assignment type, as percentages</caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className={cn(th, 'sticky left-0 z-10 bg-surface-2')}>Student</th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn(th, 'text-right')}>
                W{c.week} <span className="block font-normal normal-case tracking-normal text-subtle">{TYPE_LABEL[c.type] ?? c.type}</span>
              </th>
            ))}
            <th scope="col" className={cn(th, 'text-right')}>Average</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-surface-2/60">
              <th scope="row" className="sticky left-0 z-10 max-w-48 bg-surface px-3 py-2.5 text-left font-medium">
                <span className="block truncate text-fg">{s.name}</span>
                {s.email && s.email !== s.name && <span className="block truncate text-xs font-normal text-subtle">{s.email}</span>}
              </th>
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5 text-right tabular-nums', tone(s.marks[c.key]))}>{fmt(s.marks[c.key])}</td>
              ))}
              <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', tone(s.average))}>{fmt(s.average)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-border-strong bg-surface-2">
          <tr>
            <th scope="row" className="sticky left-0 bg-surface-2 px-3 py-2.5 text-left font-semibold">Class average</th>
            {colAvg.map((v, i) => <td key={i} className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', tone(v))}>{fmt(v)}</td>)}
            <td className={cn('px-3 py-2.5 text-right font-bold tabular-nums', tone(overall))}>{fmt(overall)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function WeekChart({ data }) {
  const W = 640, H = 240, pad = { l: 36, r: 8, t: 12, b: 34 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const slot = iw / data.length
  const bw = Math.min(44, slot * 0.62)
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Average mark per week: ${data.map((d) => `week ${d.week} ${fmt(d.average)}`).join(', ')}`}>
        {[0, 25, 50, 75, 100].map((t) => {
          const y = pad.t + ih - (t / 100) * ih
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="stroke-border" strokeDasharray={t ? '3 4' : undefined} />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" className="fill-subtle text-[11px]">{t}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const h = (Math.max(0, Math.min(100, d.average)) / 100) * ih
          const x = pad.l + slot * i + (slot - bw) / 2
          const y = pad.t + ih - h
          return (
            <g key={d.week}>
              <rect x={x} y={y} width={bw} height={h} rx="4" className={d.average >= 75 ? 'fill-emerald-500' : d.average >= 40 ? 'fill-brand-500' : 'fill-red-500'}>
                <title>{`Week ${d.week}${d.topic ? ` - ${d.topic}` : ''}: ${fmt(d.average)}% (${d.students ?? '?'} students)`}</title>
              </rect>
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" className="fill-fg text-[11px] font-semibold">{Math.round(d.average)}</text>
              <text x={x + bw / 2} y={H - 14} textAnchor="middle" className="fill-muted text-[11px]">W{d.week}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function Insights({ state, reload }) {
  if (state.loading) return <Skeleton className="h-72 rounded-xl" />
  if (state.unavailable) return <EmptyState icon={BarChart3} title="Insights are not available yet" description="Class insights will appear here once the course has graded submissions." />
  if (state.error) return <EmptyState icon={RefreshCw} title="Could not load insights" description={getErrorMessage(state.error)} action={<Button variant="outline" onClick={reload}>Try again</Button>} />
  const weeks = (state.data?.week_averages ?? []).filter((w) => w.average != null).sort((a, b) => a.week - b.week)
  const risk = state.data?.students_at_risk ?? []
  if (!weeks.length && !risk.length) return <EmptyState icon={BarChart3} title="No insights yet" description="Weekly averages and at-risk students show up after students submit work." />
  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader><CardTitle>Average mark per week</CardTitle><CardDescription>Percentage across all students who submitted.</CardDescription></CardHeader>
        <CardContent>
          {weeks.length ? <WeekChart data={weeks} /> : <p className="text-sm text-muted">No weekly data yet.</p>}
          {weeks.some((w) => w.topic) && (
            <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-2">
              {weeks.filter((w) => w.topic).map((w) => <li key={w.week} className="truncate"><span className="font-medium text-fg">W{w.week}</span> {w.topic}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" aria-hidden="true" /> Students at risk <Badge variant="warning">{risk.length}</Badge></CardTitle>
          <CardDescription>Low average or no graded work yet.</CardDescription>
        </CardHeader>
        <CardContent>
          {risk.length === 0 ? (
            <p className="text-sm text-muted">Nobody is below the threshold. 🎉</p>
          ) : (
            <ul className="divide-y divide-border">
              {risk.map((s) => (
                <li key={s.email ?? s.user_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{s.name || s.email}</p>
                    {s.name && <p className="truncate text-xs text-subtle">{s.email}</p>}
                  </div>
                  {s.average == null ? <Badge>No submissions</Badge> : <Badge variant="danger">{fmt(s.average)}%</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InstructorGradebook() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [grades, setGrades] = useState({ loading: true })
  const [insights, setInsights] = useState({ loading: true })

  const loadGrades = useCallback(async () => {
    setGrades({ loading: true })
    try {
      setGrades({ data: await getGradebook(courseId) })
    } catch (e) {
      setGrades(isMissing(e) ? { unavailable: true } : { error: e })
    }
  }, [courseId])
  const loadInsights = useCallback(async () => {
    setInsights({ loading: true })
    try {
      setInsights({ data: await getCourseInsights(courseId) })
    } catch (e) {
      setInsights(isMissing(e) ? { unavailable: true } : { error: e })
    }
  }, [courseId])
  useEffect(() => {
    loadGrades()
    loadInsights()
  }, [loadGrades, loadInsights])

  const book = useMemo(() => (grades.data ? buildGradebook(grades.data) : null), [grades.data])
  const empty = book && (!book.students.length || !book.columns.length)

  return (
    <PageContainer wide>
      <PageHeader
        title="Gradebook"
        description={`Marks and insights for ${currentCourse?.course_name ?? courseId}.`}
        actions={
          <Button variant="outline" disabled={!book || empty} onClick={() => toCsv(book.columns, book.students, courseId)}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />

      <section aria-labelledby="gb-h" className="mb-10">
        <h2 id="gb-h" className="mb-3 text-lg font-semibold tracking-tight">Marks</h2>
        {grades.loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : grades.unavailable ? (
          <EmptyState icon={Table2} title="Gradebook is not available yet" description="The server does not expose course marks for this course." />
        ) : grades.error ? (
          <EmptyState icon={RefreshCw} title="Could not load the gradebook" description={getErrorMessage(grades.error)} action={<Button variant="outline" onClick={loadGrades}>Try again</Button>} />
        ) : empty ? (
          <EmptyState icon={Table2} title="No marks yet" description="Marks appear as soon as students submit graded work." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <Badge variant="brand">{book.students.length} students</Badge>
              <Badge>{book.columns.length} graded columns</Badge>
            </div>
            <GradeTable columns={book.columns} students={book.students} />
          </>
        )}
      </section>

      <section aria-labelledby="in-h">
        <h2 id="in-h" className="mb-3 text-lg font-semibold tracking-tight">Insights</h2>
        <Insights state={insights} reload={loadInsights} />
      </section>
    </PageContainer>
  )
}
