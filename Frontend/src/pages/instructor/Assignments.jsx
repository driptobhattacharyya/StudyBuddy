import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, isPast } from 'date-fns'
import { ClipboardList, ListPlus, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { createAssignment, deleteAssignment, getAssignments, updateAssignment } from '@/lib/services/assignments'
import { generateFromMaterial } from '@/lib/services/ai'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { UnderTheHood } from '@/components/ai/UnderTheHood'
import { ConfirmDialog } from '@/components/instructor/Confirm'
import { QuestionFields } from '@/components/instructor/QuestionFields'
import { QuizDraft } from '@/components/instructor/QuizDraft'
import { WeekSelect } from '@/components/instructor/WeekFilter'
import { ASSGN_TYPES, assgnLabel, blankQuestion, fromApiQuestion, parseBulk, toApiQuestion, validateQuestion } from '@/components/instructor/question'
import { WEEKS, defaultDeadline, fromLocalInput, idOf, toLocalInput } from '@/components/instructor/utils'
import { cn } from '@/lib/cn'

const TYPES = ['PA', 'GA', 'AQ']

function QuestionEditor({ item, courseId, defaults, onClose, onSaved }) {
  const [q, setQ] = useState(() => (item ? fromApiQuestion(item) : blankQuestion()))
  const [week, setWeek] = useState(item?.week ?? defaults.week)
  const [type, setType] = useState(item?.assgn_type ?? defaults.type)
  const [deadline, setDeadline] = useState(item?.deadline ? toLocalInput(item.deadline) : defaultDeadline())
  const [evaluated, setEvaluated] = useState(item?.evaluated ?? defaults.type === 'GA')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const err = validateQuestion(q) || (!fromLocalInput(deadline) ? 'Pick a valid deadline.' : '')
    setError(err)
    if (err) return
    setBusy(true)
    const body = { ...toApiQuestion(q), assgn_type: type, week, evaluated, deadline: fromLocalInput(deadline) }
    try {
      if (item) await updateAssignment(idOf(item), { ...body, course_id: courseId })
      else await createAssignment({ ...body, course_id: courseId })
      toast.success(item ? 'Question updated' : 'Question created')
      onSaved()
    } catch (e2) {
      toast.error('Could not save question', { description: getErrorMessage(e2) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={item ? 'Edit question' : 'New question'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="q-form" loading={busy}>{item ? 'Save changes' : 'Create question'}</Button>
        </>
      }
    >
      <form id="q-form" onSubmit={save} noValidate className="space-y-5">
        <QuestionFields q={q} onChange={setQ} error={error} />
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
          <WeekSelect value={week} onChange={setWeek} />
          <Select label="Assignment type" value={type} onChange={(e) => setType(e.target.value)}>
            {ASSGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
          <input type="checkbox" role="switch" checked={evaluated} onChange={(e) => setEvaluated(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
          <span>
            <span className="block text-sm font-medium text-fg">Evaluated</span>
            <span className="block text-xs text-muted">Counts towards the student&apos;s marks once the deadline passes.</span>
          </span>
        </label>
      </form>
    </Dialog>
  )
}

function BulkAdd({ courseId, defaults, onClose, onPublished }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const sample = 'What is 2 + 2?\n* 4\n3\n5\n\nWhich are prime?\n* 2\n* 3\n4\n6'
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Bulk add questions" className="max-w-2xl"
      description="One question per block, separated by a blank line. First line is the question, following lines are options; prefix correct options with *.">
      {!parsed ? (
        <div className="space-y-3">
          <Textarea aria-label="Questions" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={sample} className="font-mono text-[13px]" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setText(sample)}>Insert example</Button>
            <Button
              disabled={!text.trim()}
              onClick={() => {
                const list = parseBulk(text)
                if (!list.length) return toast.error('No questions found')
                setParsed(list.map(toApiQuestion))
              }}
            >
              Review {text.trim() ? 'questions' : ''}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => setParsed(null)}>Back to text</Button>
          <QuizDraft initial={parsed} courseId={courseId} defaultWeek={defaults.week} onPublished={(n) => { onPublished(n); onClose() }} />
        </div>
      )}
    </Dialog>
  )
}

function Similar({ item, courseId, onClose, onPublished }) {
  const [count, setCount] = useState(3)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(null)

  const run = useCallback(async (n) => {
    setBusy(true)
    const opts = (item.options ?? []).map((o, i) => `${i + 1}. ${o}`).join('\n')
    const text = `Write new ${item.q_type} practice questions of the same difficulty and topic as this example question. Do not repeat it.\n\nQuestion: ${item.question}\n${opts}`
    try {
      const d = await generateFromMaterial({ text, n_questions: n, course_id: courseId })
      setDraft((prev) => ({ ...d, gen: (prev?.gen ?? 0) + 1 }))
    } catch (e) {
      toast.error('AI generation failed', { description: getErrorMessage(e) })
    } finally {
      setBusy(false)
    }
  }, [item, courseId])
  useEffect(() => {
    run(3)
  }, [run])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Similar questions" className="max-w-2xl"
      description={<span className="line-clamp-2">Based on: {item.question}</span>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select aria-label="Number of questions" value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-32">
            {[2, 3, 5, 8].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </Select>
          <Button variant="outline" loading={busy} onClick={() => run(count)}><Sparkles className="size-4" /> Regenerate</Button>
          <span className="ml-auto"><UnderTheHood traceId={draft?.trace_id} /></span>
        </div>
        {busy && !draft ? (
          <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        ) : draft ? (
          <QuizDraft key={draft.gen} initial={draft.quiz ?? []} courseId={courseId} defaultWeek={item.week} onPublished={(n) => { onPublished(n); onClose() }} />
        ) : null}
      </div>
    </Dialog>
  )
}

function QuestionCard({ item, onEdit, onDelete, onSimilar }) {
  const numeric = item.q_type === 'Numeric' || item.q_type === 'Float' || item.q_type === 'String'
  const answers = (item.answers ?? []).map(String)
  const due = item.deadline ? new Date(item.deadline) : null
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="brand">Week {item.week}</Badge>
        <Badge variant={item.assgn_type === 'GA' ? 'warning' : 'neutral'}>{assgnLabel(item.assgn_type)}</Badge>
        <Badge>{item.q_type}</Badge>
        {item.evaluated && <Badge variant="success">Evaluated</Badge>}
        {due && (
          <Badge variant={isPast(due) ? 'danger' : 'neutral'} className="ml-auto">
            {isPast(due) ? 'Closed' : 'Due'} {format(due, 'd MMM yyyy, HH:mm')}
          </Badge>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words font-medium text-fg">{item.question}</p>
      {numeric ? (
        <p className="mt-2 text-sm"><span className="text-muted">Answer: </span><span className="font-semibold text-emerald-700 dark:text-emerald-300">{answers.join(', ') || '-'}</span></p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {(item.options ?? []).map((o, i) => {
            const ok = answers.includes(String(o))
            return (
              <li key={i} className={cn('flex items-start gap-2 rounded-lg border px-3 py-1.5 text-sm', ok ? 'border-emerald-300 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-border text-muted')}>
                <span aria-hidden="true">{ok ? '✓' : '○'}</span>
                <span className="min-w-0 break-words">{String(o)}</span>
                {ok && <span className="sr-only">(correct)</span>}
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <Button size="sm" variant="ghost" onClick={() => onSimilar(item)}><Sparkles className="size-4" /> Generate similar</Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(item)}><Pencil className="size-4" /> Edit</Button>
        <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400" aria-label="Delete question" onClick={() => onDelete(item)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Card>
  )
}

export default function InstructorAssignments() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [week, setWeek] = useState(1)
  const [type, setType] = useState('')
  const [qType, setQType] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [editor, setEditor] = useState(null)
  const [bulk, setBulk] = useState(false)
  const [similar, setSimilar] = useState(null)
  const [del, setDel] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setItems(null)
    const weeks = week === '' ? WEEKS : [week]
    const types = type ? [type] : TYPES
    const calls = weeks.flatMap((w) => types.map((t) => getAssignments(courseId, w, t)))
    const res = await Promise.allSettled(calls)
    const ok = res.filter((r) => r.status === 'fulfilled')
    if (!ok.length) {
      setError(res[0].reason)
      setItems([])
      return
    }
    setItems(ok.flatMap((r) => r.value ?? []))
  }, [courseId, week, type])
  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(
    () => (items ?? []).filter((i) => !qType || i.q_type === qType).sort((a, b) => a.week - b.week || TYPES.indexOf(a.assgn_type) - TYPES.indexOf(b.assgn_type)),
    [items, qType],
  )
  const defaults = { week: week || 1, type: type || 'PA' }

  return (
    <PageContainer>
      <PageHeader
        title="Assignments"
        description={`Questions for ${currentCourse?.course_name ?? courseId}. Correct answers are visible here only to instructors.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulk(true)}><ListPlus className="size-4" /> Bulk add</Button>
            <Button onClick={() => setEditor({})}><Plus className="size-4" /> New question</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Select aria-label="Filter by week" value={week} onChange={(e) => setWeek(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">All weeks</option>
          {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </Select>
        <Select aria-label="Filter by assignment type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Graded and practice</option>
          {ASSGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select aria-label="Filter by question type" value={qType} onChange={(e) => setQType(e.target.value)} className="col-span-2 sm:col-span-1">
          <option value="">MCQ, MSQ and numeric</option>
          <option value="MCQ">MCQ</option>
          <option value="MSQ">MSQ</option>
          <option value="Numeric">Numeric</option>
        </Select>
      </div>

      {items === null ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState icon={RefreshCw} title="Could not load questions" description={getErrorMessage(error)} action={<Button variant="outline" onClick={load}>Try again</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No questions here yet" description="Add a question, bulk-import a list, or generate some with AI from an existing question."
          action={<Button onClick={() => setEditor({})}><Plus className="size-4" /> New question</Button>} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">{shown.length} question{shown.length === 1 ? '' : 's'}</p>
          <ul className="space-y-4">
            {shown.map((i) => (
              <li key={idOf(i)}><QuestionCard item={i} onEdit={(x) => setEditor({ item: x })} onDelete={setDel} onSimilar={setSimilar} /></li>
            ))}
          </ul>
        </>
      )}

      {editor && <QuestionEditor item={editor.item} courseId={courseId} defaults={defaults} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load() }} />}
      {bulk && <BulkAdd courseId={courseId} defaults={defaults} onClose={() => setBulk(false)} onPublished={load} />}
      {similar && <Similar item={similar} courseId={courseId} onClose={() => setSimilar(null)} onPublished={load} />}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this question?"
        description="Students will no longer see it and any marks tied to it may change."
        onConfirm={async () => {
          try {
            await deleteAssignment(idOf(del))
            toast.success('Question deleted')
            load()
          } catch (e) {
            toast.error('Could not delete question', { description: getErrorMessage(e) })
            throw e
          }
        }}
      />
    </PageContainer>
  )
}
