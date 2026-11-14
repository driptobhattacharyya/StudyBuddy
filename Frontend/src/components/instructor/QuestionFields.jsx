import { Plus, Trash2 } from 'lucide-react'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/cn'
import { Q_TYPES, blankQuestion, nextUid } from './question'

/** Controlled question builder: dynamic options, correct-answer marking. `q` is form state from question.js. */
export function QuestionFields({ q, onChange, error, idPrefix = 'q', compact }) {
  const set = (patch) => onChange({ ...q, ...patch })
  const setOpt = (id, patch) => set({ opts: q.opts.map((o) => (o.id === id ? { ...o, ...patch } : o)) })
  const toggleCorrect = (id) => {
    if (q.q_type === 'MCQ') set({ opts: q.opts.map((o) => ({ ...o, correct: o.id === id })) })
    else setOpt(id, { correct: !q.opts.find((o) => o.id === id).correct })
  }
  const changeType = (type) => {
    const next = { q_type: type }
    if (type === 'MCQ') {
      let seen = false
      next.opts = q.opts.map((o) => {
        const correct = o.correct && !seen
        if (correct) seen = true
        return { ...o, correct }
      })
    } else if (type !== 'Numeric' && !q.opts.length) next.opts = blankQuestion().opts
    set(next)
  }
  const mark = q.q_type === 'MCQ' ? 'radio' : 'checkbox'
  return (
    <div className="space-y-4">
      <Textarea
        label="Question"
        required
        rows={compact ? 2 : 3}
        value={q.question}
        onChange={(e) => set({ question: e.target.value })}
        placeholder="What is the time complexity of binary search?"
      />
      <Select label="Type" value={q.q_type} onChange={(e) => changeType(e.target.value)}>
        {Q_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </Select>
      {q.q_type === 'Numeric' ? (
        <Input label="Correct answer" required type="number" step="any" value={q.numeric} onChange={(e) => set({ numeric: e.target.value })} />
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-fg">
            Options <span className="text-xs font-normal text-subtle">- tick the correct {q.q_type === 'MCQ' ? 'answer' : 'answers'}</span>
          </legend>
          <ul className="space-y-2">
            {q.opts.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2">
                <input
                  type={mark}
                  name={`${idPrefix}-correct`}
                  checked={o.correct}
                  onChange={() => toggleCorrect(o.id)}
                  aria-label={`Option ${i + 1} is correct`}
                  className="size-4 shrink-0 accent-emerald-600"
                />
                <Input
                  aria-label={`Option ${i + 1}`}
                  value={o.text}
                  onChange={(e) => setOpt(o.id, { text: e.target.value })}
                  placeholder={`Option ${i + 1}`}
                  className={cn(o.correct && 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10')}
                  wrapperClassName="flex-1"
                />
                <Tooltip content="Remove option">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${i + 1}`}
                    disabled={q.opts.length <= 2}
                    onClick={() => set({ opts: q.opts.filter((x) => x.id !== o.id) })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Tooltip>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => set({ opts: [...q.opts, { id: nextUid(), text: '', correct: false }] })}>
            <Plus className="size-4" /> Add option
          </Button>
        </fieldset>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
