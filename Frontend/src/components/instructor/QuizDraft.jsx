import { useState } from 'react'
import { Pencil, Send, Trash2 } from 'lucide-react'
import { createManyAssignments } from '@/lib/services/assignments'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { QuestionFields } from './QuestionFields'
import { WeekSelect } from './WeekFilter'
import { ASSGN_TYPES, fromApiQuestion, toApiQuestion, validateQuestion } from './question'
import { defaultDeadline, fromLocalInput } from './utils'

/** Editable AI quiz draft + publish (POST /assignment/create_many_questions). `initial` is the API quiz array. */
export function QuizDraft({ initial, courseId, defaultWeek = 1, onPublished }) {
  const [items, setItems] = useState(() => initial.map((q, i) => ({ key: i, q: fromApiQuestion(q) })))
  const [editing, setEditing] = useState(null)
  const [week, setWeek] = useState(defaultWeek)
  const [assgnType, setAssgnType] = useState('PA')
  const [deadline, setDeadline] = useState(defaultDeadline)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})

  const publish = async () => {
    const errs = {}
    items.forEach((it) => {
      const e = validateQuestion(it.q)
      if (e) errs[it.key] = e
    })
    setErrors(errs)
    if (Object.keys(errs).length) {
      setEditing(Number(Object.keys(errs)[0]))
      return toast.error('Fix the highlighted questions first')
    }
    if (!fromLocalInput(deadline)) return toast.error('Pick a deadline')
    setBusy(true)
    try {
      await createManyAssignments(
        items.map((it) => ({
          ...toApiQuestion(it.q),
          assgn_type: assgnType,
          course_id: courseId,
          week,
          evaluated: assgnType === 'GA',
          deadline: fromLocalInput(deadline),
        })),
      )
      toast.success(`Published ${items.length} question${items.length === 1 ? '' : 's'}`)
      onPublished?.(items.length)
      setItems([])
    } catch (e) {
      toast.error('Could not publish questions', { description: getErrorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  if (!items.length) return <p className="text-sm text-muted">No questions left in this draft.</p>
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={it.key} className="rounded-lg border border-border bg-surface p-3">
            {editing === it.key ? (
              <div>
                <QuestionFields q={it.q} idPrefix={`draft${it.key}`} error={errors[it.key]} compact onChange={(q) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, q } : x)))} />
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(null)}>Done</Button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-fg">{it.q.question || <em className="text-subtle">Empty question</em>}</p>
                  {it.q.q_type === 'Numeric' ? (
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">Answer: {it.q.numeric}</p>
                  ) : (
                    <ul className="mt-1.5 space-y-0.5 text-sm">
                      {it.q.opts.map((o) => (
                        <li key={o.id} className={o.correct ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-muted'}>
                          {o.correct ? '✓' : '○'} {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors[it.key] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[it.key]}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Edit question ${idx + 1}`} onClick={() => setEditing(it.key)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Discard question ${idx + 1}`} onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="grid gap-3 rounded-lg border border-border bg-surface-2/50 p-3 sm:grid-cols-3">
        <WeekSelect value={week} onChange={setWeek} />
        <Select label="Type" value={assgnType} onChange={(e) => setAssgnType(e.target.value)}>
          {ASSGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Badge variant="brand">{items.length} question{items.length === 1 ? '' : 's'}</Badge>
        <Button onClick={publish} loading={busy}><Send className="size-4" /> Publish as assignments</Button>
      </div>
    </div>
  )
}
