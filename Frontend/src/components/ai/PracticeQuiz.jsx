import { useState } from 'react'
import { Check, Eye, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { UnderTheHood } from './UnderTheHood'
import { normalizeGeneratedQuestions } from './normalizeQuestions'

function QuizQuestion({ q, index }) {
  const [picked, setPicked] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const check = revealed || picked != null
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">
        <span className="mr-1.5 text-brand-600 dark:text-brand-300">{index + 1}.</span>
        {q.question}
      </p>
      <div role="radiogroup" aria-label={`Question ${index + 1}`} className="mt-3 space-y-2">
        {q.options.map((opt) => {
          const isCorrect = opt === q.correct
          const isPicked = picked === opt
          return (
            <button
              key={opt}
              role="radio"
              aria-checked={isPicked}
              disabled={check}
              onClick={() => setPicked(opt)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                !check && 'border-border hover:border-brand-400 hover:bg-surface-2',
                check && isCorrect && 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200',
                check && isPicked && !isCorrect && 'border-red-400 bg-red-50 text-red-900 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-200',
                check && !isCorrect && !isPicked && 'border-border opacity-60',
              )}
            >
              <span className="min-w-0 flex-1 break-words">{opt}</span>
              {check && isCorrect && <Check className="size-4 shrink-0" aria-label="Correct answer" />}
              {check && isPicked && !isCorrect && <X className="size-4 shrink-0" aria-label="Your answer, incorrect" />}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2" aria-live="polite">
        {!check ? (
          <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>
            <Eye className="size-4" /> Reveal answer
          </Button>
        ) : (
          <>
            <p className="text-xs font-medium text-muted">
              {picked == null ? 'Answer revealed.' : picked === q.correct ? 'Nice - that is correct.' : 'Not quite - the correct option is highlighted.'}
            </p>
            <Button size="sm" variant="ghost" onClick={() => { setPicked(null); setRevealed(false) }}>
              <RotateCcw className="size-3.5" /> Retry
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

/**
 * <PracticeQuiz questions={raw|normalised} traceId="..." /> - interactive AI-generated MCQs:
 * pick an option (or reveal) to see the correct answer. Includes an "Under the hood" button.
 */
export function PracticeQuiz({ questions, traceId, className }) {
  const items = normalizeGeneratedQuestions(questions)
  if (!items.length) return <p className="text-sm text-muted">The AI did not return any usable questions. Try again.</p>
  return (
    <div className={className}>
      <ol className="space-y-3">
        {items.map((q, i) => (
          <QuizQuestion key={`${i}-${q.question}`} q={q} index={i} />
        ))}
      </ol>
      <div className="mt-2 flex justify-end">
        <UnderTheHood traceId={traceId} />
      </div>
    </div>
  )
}
