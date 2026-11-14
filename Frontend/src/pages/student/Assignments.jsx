/**
 * Student assignments (MCQ / MSQ / numeric). Replaces legacy Assignment/Assignment.jsx.
 * Endpoints: GET /course/get_contents?course_id= (assignments with assgn_id|_id, no answers);
 * POST /user/submit_answers [{assgn_id, answer: any[]}] -> { results: [{assgn_id, mark, correct}] } (graded on submit);
 * GET /user/get_marks?course_id= -> [{week, assgn_type, mark(%)}]; GET /user/insights/{course_id} (optional);
 * WS /generate (streamed Socratic hint); POST /generate_assignment_questions {text} (more like this).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { differenceInHours, format, formatDistanceToNowStrict, isPast } from 'date-fns'
import { AlertCircle, Award, CheckCircle2, ClipboardList, Clock, Lightbulb, Lock, RefreshCw, Send, Sparkles, TrendingDown, XCircle } from 'lucide-react'
import { getCourseContents } from '@/lib/services/courses'
import { getMarks, getMyInsights, submitAnswers } from '@/lib/services/assignments'
import { buildQuestionHintQuery, generateSimilarFull, WS_ASSISTANT } from '@/lib/services/ai'
import { useAIStream } from '@/lib/stream'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { useLocalState } from '@/lib/useLocalState'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Markdown, PracticeQuiz, UnderTheHood } from '@/components/ai'

const TYPE_LABEL = { AQ: 'Practice', PA: 'Practice', GA: 'Graded' }
const idOf = (a) => a._id ?? a.assgn_id
const isGraded = (a) => a.assgn_type === 'GA'
const isNumeric = (a) => a.q_type !== 'MCQ' && a.q_type !== 'MSQ'
const isClosed = (a) => isGraded(a) && a.deadline && isPast(new Date(a.deadline))

function DeadlineBadge({ deadline, graded }) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d)) return null
  if (isPast(d)) return <Badge variant={graded ? 'danger' : 'neutral'}><Lock className="size-3" /> {graded ? 'Closed' : 'Deadline passed'}</Badge>
  const soon = differenceInHours(d, new Date()) < 48
  return (
    <Badge variant={soon ? 'warning' : 'neutral'} title={format(d, 'PPp')}>
      <Clock className="size-3" /> Due in {formatDistanceToNowStrict(d)}
    </Badge>
  )
}

function Hint({ question, selected }) {
  const { text, status, error, meta, send, stop, isStreaming } = useAIStream(WS_ASSISTANT)
  const ask = () => send({ query: buildQuestionHintQuery({ question: question.question, options: question.options ?? [], selected }) })
  return (
    <div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={isStreaming ? stop : ask}>
          <Lightbulb className="size-4" /> {isStreaming ? 'Stop' : text ? 'Another hint' : 'Hint'}
        </Button>
      </div>
      {(text || error) && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10" aria-live="polite">
          {text && <Markdown className="prose-sm">{text}</Markdown>}
          {status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-500 align-middle" aria-hidden="true" />}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {status === 'done' && meta?.trace_id && <div className="mt-1 flex justify-end"><UnderTheHood traceId={meta.trace_id} /></div>}
        </div>
      )}
    </div>
  )
}

function MoreLikeThis({ question }) {
  const [state, setState] = useState({ loading: false, data: null })
  const [open, setOpen] = useState(false)
  const run = async () => {
    setOpen(true)
    setState({ loading: true, data: null })
    try {
      const text = `${question.question}\n${(question.options ?? []).map((o, i) => `${i + 1}. ${o}`).join('\n')}`
      setState({ loading: false, data: await generateSimilarFull(text) })
    } catch (e) {
      toast.error('Could not generate questions', { description: getErrorMessage(e) })
      setState({ loading: false, data: null })
      setOpen(false)
    }
  }
  return (
    <>
      <Button size="sm" variant="ghost" onClick={run}><Sparkles className="size-4" /> More like this</Button>
      <Dialog open={open} onOpenChange={setOpen} title="More questions like this" description="AI-generated practice - answers are checked locally." className="max-w-2xl">
        {state.loading ? (
          <div className="space-y-3" role="status" aria-label="Generating"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        ) : state.data ? (
          <PracticeQuiz questions={state.data.questions} traceId={state.data.trace_id} />
        ) : null}
      </Dialog>
    </>
  )
}

function QuestionCard({ q, index, answer, setAnswer, result, locked }) {
  const opts = q.options ?? []
  const multi = q.q_type === 'MSQ'
  const toggle = (opt) => {
    if (multi) setAnswer(answer.includes(opt) ? answer.filter((a) => a !== opt) : [...answer, opt])
    else setAnswer([opt])
  }
  return (
    <Card className={cn(result && (result.correct ? 'border-emerald-300 dark:border-emerald-500/40' : result.mark > 0 ? 'border-amber-300 dark:border-amber-500/40' : 'border-red-300 dark:border-red-500/40'))}>
      <CardContent className="p-4 pt-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">Q{index + 1}</Badge>
          <Badge>{q.q_type}</Badge>
          <Badge variant={isGraded(q) ? 'warning' : 'success'}>{TYPE_LABEL[q.assgn_type] ?? q.assgn_type}</Badge>
          <DeadlineBadge deadline={q.deadline} graded={isGraded(q)} />
          {result && (
            <Badge variant={result.correct ? 'success' : result.mark > 0 ? 'warning' : 'danger'} className="ml-auto">
              {result.correct ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
              {result.correct ? 'Correct' : result.mark > 0 ? `Partial ${Math.round(result.mark * 100)}%` : 'Incorrect'}
            </Badge>
          )}
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-fg">{q.question}</p>
        {multi && <p className="mt-1 text-xs text-muted">Select all that apply.</p>}

        {isNumeric(q) ? (
          <Input
            className="mt-3 max-w-xs"
            aria-label={`Answer to question ${index + 1}`}
            inputMode="decimal"
            placeholder="Your answer"
            disabled={locked}
            value={answer[0] ?? ''}
            onChange={(e) => setAnswer(e.target.value === '' ? [] : [e.target.value])}
          />
        ) : (
          <div role={multi ? 'group' : 'radiogroup'} aria-label={`Options for question ${index + 1}`} className="mt-3 space-y-2">
            {opts.map((opt) => {
              const checked = answer.includes(String(opt))
              return (
                <label
                  key={opt}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500',
                    checked ? 'border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10' : 'border-border hover:bg-surface-2',
                    locked && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <input
                    type={multi ? 'checkbox' : 'radio'}
                    name={`q-${idOf(q)}`}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-600)]"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggle(String(opt))}
                  />
                  <span className="min-w-0 break-words">{String(opt)}</span>
                </label>
              )
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-start gap-x-1 gap-y-2 border-t border-border pt-3">
          <Hint question={q} selected={answer} />
          <MoreLikeThis question={q} />
        </div>
      </CardContent>
    </Card>
  )
}

function MarksSummary({ marks, insights, loading }) {
  const rows = [...marks].sort((a, b) => a.week - b.week || String(a.assgn_type).localeCompare(String(b.assgn_type)))
  const avg = rows.length ? Math.round(rows.reduce((s, m) => s + (m.mark ?? 0), 0) / rows.length) : null
  const weak = insights?.weak_topics ?? []
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="size-4 text-brand-500" aria-hidden="true" /> My marks</CardTitle>
          <CardDescription>Percentage per week and assignment type.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-16" /> : rows.length === 0 ? (
            <p className="rounded-lg bg-surface-2 px-4 py-4 text-sm text-muted">No marks yet - submit an assignment to see your progress here.</p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0">
                <p className="text-3xl font-semibold tracking-tight">{avg}%</p>
                <p className="text-xs text-muted">average</p>
              </div>
              <ul className="grid flex-1 gap-2 sm:grid-cols-2">
                {rows.slice(0, 8).map((m) => (
                  <li key={`${m.week}-${m.assgn_type}`}>
                    <div className="mb-1 flex justify-between text-xs"><span className="text-muted">Week {m.week} - {TYPE_LABEL[m.assgn_type] ?? m.assgn_type}</span><span className="font-medium">{Math.round(m.mark)}%</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(m.mark)} aria-valuemin={0} aria-valuemax={100}>
                      <div className={cn('h-full rounded-full', m.mark >= 70 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, m.mark)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingDown className="size-4 text-brand-500" aria-hidden="true" /> Insights</CardTitle>
            <CardDescription>Topics worth revisiting.</CardDescription>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? <p className="rounded-lg bg-surface-2 px-4 py-4 text-sm text-muted">No weak topics - keep it up.</p> : (
              <ul className="space-y-2">
                {weak.slice(0, 4).map((w) => (
                  <li key={w.week} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">Week {w.week}: {w.topic}</span>
                    <Badge variant="warning">{Math.round(w.mark)}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function StudentAssignments() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [state, setState] = useState({ loading: true, items: [], error: null })
  const [marks, setMarks] = useState({ loading: true, rows: [] })
  const [insights, setInsights] = useState(null)
  const [week, setWeek] = useLocalState(`sb:assign-week:${courseId}`, 'all')
  const [type, setType] = useLocalState(`sb:assign-type:${courseId}`, 'all')
  const [answers, setAnswers] = useLocalState(`sb:answers:${courseId}`, {})
  const [results, setResults] = useLocalState(`sb:results:${courseId}`, {})
  const [confirm, setConfirm] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadMarks = useCallback(() => {
    getMarks(courseId).then((rows) => setMarks({ loading: false, rows: Array.isArray(rows) ? rows : [] })).catch(() => setMarks({ loading: false, rows: [] }))
    getMyInsights(courseId).then(setInsights).catch(() => setInsights(null))
  }, [courseId])

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    getCourseContents(courseId)
      .then((data) => setState({ loading: false, items: (data?.assignments ?? []).filter((a) => ['AQ', 'PA', 'GA'].includes(a.assgn_type)), error: null }))
      .catch((e) => {
        toast.error('Could not load assignments', { description: getErrorMessage(e) })
        setState({ loading: false, items: [], error: getErrorMessage(e) })
      })
    loadMarks()
  }, [courseId, loadMarks])
  useEffect(() => { load() }, [load])

  const weeks = useMemo(() => [...new Set(state.items.map((a) => a.week))].sort((a, b) => a - b), [state.items])
  const visible = useMemo(
    () => state.items.filter((a) => (week === 'all' || a.week === Number(week)) && (type === 'all' || (type === 'graded') === isGraded(a))),
    [state.items, week, type],
  )
  const groups = useMemo(() => {
    const m = new Map()
    for (const a of visible) {
      const k = `${a.week}|${isGraded(a) ? 'graded' : 'practice'}`
      if (!m.has(k)) m.set(k, { key: k, week: a.week, graded: isGraded(a), items: [] })
      m.get(k).items.push(a)
    }
    return [...m.values()].sort((a, b) => a.week - b.week || a.graded - b.graded)
  }, [visible])

  const doSubmit = async (group) => {
    const payload = group.items.filter((a) => (answers[idOf(a)] ?? []).length).map((a) => ({ assgn_id: idOf(a), answer: answers[idOf(a)] }))
    setSubmitting(true)
    try {
      const res = await submitAnswers(payload)
      const next = {}
      for (const r of res.results ?? []) next[r.assgn_id] = { mark: r.mark, correct: r.correct }
      setResults((prev) => ({ ...prev, ...next }))
      const got = Object.values(next)
      toast.success('Answers submitted', { description: `${got.filter((r) => r.correct).length} of ${group.items.length} correct` })
      setConfirm(null)
      loadMarks()
    } catch (e) {
      toast.error('Submission failed', { description: getErrorMessage(e) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Assignments" description={`Practice and graded questions for ${currentCourse?.course_name ?? courseId}.`} actions={<Badge variant="brand">{courseId}</Badge>} />
      <MarksSummary marks={marks.rows} insights={insights} loading={marks.loading} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select aria-label="Filter by week" className="sm:w-44" value={week} onChange={(e) => setWeek(e.target.value)}>
          <option value="all">All weeks</option>
          {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </Select>
        <div role="group" aria-label="Filter by type" className="inline-flex self-start rounded-lg border border-border bg-surface-2 p-0.5">
          {[['all', 'All'], ['practice', 'Practice'], ['graded', 'Graded']].map(([v, l]) => (
            <button key={v} aria-pressed={type === v} onClick={() => setType(v)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', type === v ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}>{l}</button>
          ))}
        </div>
      </div>

      {state.loading ? (
        <div className="space-y-4" role="status" aria-label="Loading assignments">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : state.error ? (
        <EmptyState icon={AlertCircle} title="Could not load assignments" description={state.error} action={<Button variant="outline" onClick={load}><RefreshCw className="size-4" /> Retry</Button>} />
      ) : groups.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments here" description={state.items.length ? 'Nothing matches these filters.' : 'No assignments have been published for this course yet.'} />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const done = g.items.filter((a) => results[idOf(a)])
            const correct = done.filter((a) => results[idOf(a)].correct).length
            const answered = g.items.filter((a) => (answers[idOf(a)] ?? []).length).length
            const closed = g.items.every(isClosed)
            return (
              <section key={g.key} aria-labelledby={`g-${g.key}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 id={`g-${g.key}`} className="text-lg font-semibold tracking-tight">Week {g.week} - {g.graded ? 'Graded' : 'Practice'}</h2>
                  <Badge>{answered}/{g.items.length} answered</Badge>
                  {done.length > 0 && <Badge variant={correct === g.items.length ? 'success' : 'brand'}>Score {correct}/{g.items.length}</Badge>}
                </div>
                <div className="space-y-4">
                  {g.items.map((a, i) => (
                    <QuestionCard key={idOf(a)} q={a} index={i} answer={answers[idOf(a)] ?? []} result={results[idOf(a)]} locked={isClosed(a)}
                      setAnswer={(v) => setAnswers((p) => ({ ...p, [idOf(a)]: v }))} />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                  <p className="text-sm text-muted">{closed ? 'This set is closed for submissions.' : 'Answers are saved on this device as you go. Marks are shown after you submit.'}</p>
                  <Button disabled={closed || answered === 0} onClick={() => setConfirm(g)}><Send className="size-4" /> Submit answers</Button>
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Submit your answers?"
        description={confirm && `Week ${confirm.week} - ${confirm.graded ? 'Graded' : 'Practice'}`}
        footer={<>
          <DialogClose asChild><Button variant="outline">Keep editing</Button></DialogClose>
          <Button loading={submitting} onClick={() => doSubmit(confirm)}>Submit</Button>
        </>}
      >
        {confirm && (
          <p className="text-sm text-muted">
            You have answered {confirm.items.filter((a) => (answers[idOf(a)] ?? []).length).length} of {confirm.items.length} questions. Unanswered questions score zero.
            {confirm.graded && ' Graded work is marked immediately and counts towards your grade.'}
          </p>
        )}
      </Dialog>
    </PageContainer>
  )
}
