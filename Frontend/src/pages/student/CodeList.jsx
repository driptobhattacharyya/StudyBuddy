/**
 * Coding problems list. Replaces legacy Code/Questions.jsx.
 * Endpoint: GET /course/get_contents?course_id= -> coding_assignments[{ assgn_id|_id, question, language, public_testcase,
 * assgn_type: PPA|GrPA, week, deadline, difficulty? }]. Status (attempted/solved) is remembered per device after Run/Submit.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { differenceInHours, format, formatDistanceToNowStrict, isPast } from 'date-fns'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Code2, Lock, RefreshCw } from 'lucide-react'
import { getCourseContents } from '@/lib/services/courses'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { getCodeStatus, LANG_LABEL, titleOf } from '@/lib/codeStatus'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'

const idOf = (a) => a._id ?? a.assgn_id
const DIFF = { easy: 'success', medium: 'warning', hard: 'danger' }

function Deadline({ deadline, graded }) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d)) return null
  if (isPast(d)) return <Badge variant={graded ? 'danger' : 'neutral'}><Lock className="size-3" /> Closed</Badge>
  return (
    <Badge variant={differenceInHours(d, new Date()) < 48 ? 'warning' : 'neutral'} title={format(d, 'PPp')}>
      <Clock className="size-3" /> Due in {formatDistanceToNowStrict(d)}
    </Badge>
  )
}

function StatusBadge({ id }) {
  const s = getCodeStatus(id)
  if (!s) return <Badge>Not started</Badge>
  if (s.state === 'solved') return <Badge variant="success"><CheckCircle2 className="size-3" /> Solved</Badge>
  return <Badge variant="brand">Attempted {s.passed != null ? `- ${s.passed}/${s.total}` : ''}</Badge>
}

export default function StudentCodeList() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [state, setState] = useState({ loading: true, items: [], error: null })
  const [filters, setFilters] = useState({ week: 'all', type: 'all', language: 'all' })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    getCourseContents(courseId)
      .then((d) => setState({ loading: false, items: d?.coding_assignments ?? [], error: null }))
      .catch((e) => {
        toast.error('Could not load coding problems', { description: getErrorMessage(e) })
        setState({ loading: false, items: [], error: getErrorMessage(e) })
      })
  }, [courseId])
  useEffect(() => { load() }, [load])

  const weeks = useMemo(() => [...new Set(state.items.map((a) => a.week))].sort((a, b) => a - b), [state.items])
  const langs = useMemo(() => [...new Set(state.items.map((a) => a.language).filter(Boolean))], [state.items])
  const visible = state.items.filter(
    (a) => (filters.week === 'all' || a.week === Number(filters.week)) && (filters.type === 'all' || a.assgn_type === filters.type) && (filters.language === 'all' || a.language === filters.language),
  )
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  return (
    <PageContainer>
      <PageHeader title="Coding assignments" description={`Programming problems for ${currentCourse?.course_name ?? courseId}, with an in-browser editor and test cases.`} actions={<Badge variant="brand">{courseId}</Badge>} />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <Select aria-label="Filter by week" value={filters.week} onChange={set('week')}>
          <option value="all">All weeks</option>
          {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </Select>
        <Select aria-label="Filter by type" value={filters.type} onChange={set('type')}>
          <option value="all">Practice and graded</option>
          <option value="PPA">Practice</option>
          <option value="GrPA">Graded</option>
        </Select>
        <Select aria-label="Filter by language" value={filters.language} onChange={set('language')}>
          <option value="all">All languages</option>
          {langs.map((l) => <option key={l} value={l}>{LANG_LABEL[l] ?? l}</option>)}
        </Select>
      </div>

      {state.loading ? (
        <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading problems">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : state.error ? (
        <EmptyState icon={AlertCircle} title="Could not load problems" description={state.error} action={<Button variant="outline" onClick={load}><RefreshCw className="size-4" /> Retry</Button>} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Code2} title="No coding problems" description={state.items.length ? 'Nothing matches these filters.' : 'No coding assignments have been published for this course yet.'} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((a) => (
            <li key={idOf(a)}>
              <Link to={idOf(a)} className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                <Card interactive className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="brand">Week {a.week}</Badge>
                    <Badge>{LANG_LABEL[a.language] ?? a.language}</Badge>
                    <Badge variant={a.assgn_type === 'GrPA' ? 'warning' : 'success'}>{a.assgn_type === 'GrPA' ? 'Graded' : 'Practice'}</Badge>
                    {a.difficulty && <Badge variant={DIFF[String(a.difficulty).toLowerCase()] ?? 'neutral'}>{a.difficulty}</Badge>}
                  </div>
                  <h2 className="mt-3 text-base font-semibold leading-snug tracking-tight text-fg">{titleOf(a.question)}</h2>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge id={idOf(a)} /><Deadline deadline={a.deadline} graded={a.assgn_type === 'GrPA'} /></div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-300">Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
