/**
 * "Generate with AI" dialog: broad topic -> preview of one-concept cards -> save the selected ones.
 * Endpoints: POST /flash_card/generate_deck (preview only), POST /flash_card/create_many (save).
 */
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Pencil, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { createManyFlashcards, generateDeck } from '@/lib/services/flashcards'
import { getNotes } from '@/lib/services/notes'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { FlipCard, Markdown, UnderTheHood } from '@/components/ai'

const COUNTS = [4, 6, 8, 10]
const WEEKS = Array.from({ length: 12 }, (_, i) => i + 1)

function PreviewCard({ card, index, onChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <li className="space-y-2 rounded-2xl border border-brand-300 bg-surface-2/40 p-3">
        <Input label={`Front of card ${index + 1}`} maxLength={200} value={card.front} onChange={(e) => onChange({ front: e.target.value })} />
        <Textarea label={`Back of card ${index + 1}`} rows={3} value={card.back} onChange={(e) => onChange({ back: e.target.value })} />
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Done editing</Button>
      </li>
    )
  }
  return (
    <li>
      <FlipCard
        className="h-44"
        label={card.front}
        topLeft={
          <input type="checkbox" className="size-4 accent-brand-600" checked={card.selected} onChange={(e) => onChange({ selected: e.target.checked })} aria-label={`Include card ${index + 1}`} />
        }
        topRight={<>
          <button type="button" aria-label={`Edit card ${index + 1}`} onClick={() => setEditing(true)} className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button>
          <button type="button" aria-label={`Remove card ${index + 1}`} onClick={onRemove} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
        </>}
        front={<Markdown inline>{card.front}</Markdown>}
        back={<Markdown className="prose-sm">{card.back}</Markdown>}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1 text-xs text-subtle">
        <Badge variant="brand">{card.week ? `Week ${card.week}` : 'General'}</Badge>
        <span>{card.source ? `Source: ${card.source}` : 'General knowledge'}</span>
      </div>
    </li>
  )
}

export function DeckGenerator({ open, onOpenChange, courseId, onSaved }) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(6)
  const [week, setWeek] = useState(12)
  const [titles, setTitles] = useState([])
  const [phase, setPhase] = useState('form') // form | loading | preview
  const [error, setError] = useState(null)
  const [deck, setDeck] = useState(null) // { cards, trace_id }
  const [saving, setSaving] = useState(false)
  const topicRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setTopic(''); setPhase('form'); setError(null); setDeck(null)
    let live = true
    getNotes(courseId)
      .then((notes) => {
        if (!live || !Array.isArray(notes)) return
        const sorted = [...notes].sort((a, b) => (a.week ?? 0) - (b.week ?? 0))
        setTitles([...new Set(sorted.map((n) => n.title).filter(Boolean))].slice(0, 5))
        const latest = Math.max(0, ...notes.map((n) => Number(n.week) || 0))
        setWeek(latest || 12)
      })
      .catch(() => {})
    return () => { live = false }
  }, [open, courseId])

  const run = async (e) => {
    e?.preventDefault()
    const t = topic.trim()
    if (t.length < 2) return
    setPhase('loading'); setError(null)
    try {
      const res = await generateDeck({ courseId, topic: t, count, week: Number(week) })
      const cards = (res.cards ?? []).map((c, i) => ({ ...c, key: `${i}-${c.front}`, selected: true }))
      if (!cards.length) {
        setError('The AI could not write cards for that topic. Try rewording it or choosing a later week.')
        setPhase('form')
        return
      }
      setDeck({ cards, trace_id: res.trace_id })
      setPhase('preview')
    } catch (err) {
      setError(getErrorMessage(err))
      setPhase('form')
    }
  }

  const patch = (key, changes) => setDeck((d) => ({ ...d, cards: d.cards.map((c) => (c.key === key ? { ...c, ...changes } : c)) }))
  const remove = (key) => setDeck((d) => ({ ...d, cards: d.cards.filter((c) => c.key !== key) }))
  const chosen = deck?.cards.filter((c) => c.selected && c.front.trim()) ?? []

  const save = async () => {
    setSaving(true)
    try {
      await createManyFlashcards({
        courseId,
        cards: chosen.map((c) => ({ title: c.front.trim().slice(0, 200), content: c.back.trim(), week: c.week ?? Number(week) })),
      })
      toast.success(`Saved ${chosen.length} flashcard${chosen.length === 1 ? '' : 's'}`)
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error('Could not save the flashcards', { description: getErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const footer = phase === 'preview' && (
    <>
      <div className="mr-auto flex items-center gap-2"><UnderTheHood traceId={deck.trace_id} /></div>
      <Button variant="outline" onClick={run}><RefreshCw className="size-4" /> Regenerate</Button>
      <Button onClick={save} loading={saving} disabled={chosen.length === 0}>Save {chosen.length} card{chosen.length === 1 ? '' : 's'}</Button>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl" footer={footer || undefined}
      title="Generate with AI" description="Enter a broad topic and the AI writes several flashcards, each covering one concept.">
      {phase === 'preview' ? (
        <div aria-live="polite">
          <p className="mb-3 text-sm text-muted">Review the cards for <strong className="text-fg">{topic.trim()}</strong>. Click a card to see its answer. Untick, edit or remove before saving.</p>
          {deck.cards.length === 0 ? <p className="py-6 text-center text-sm text-muted">All cards removed. Regenerate to try again.</p> : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {deck.cards.map((c, i) => <PreviewCard key={c.key} card={c} index={i} onChange={(ch) => patch(c.key, ch)} onRemove={() => remove(c.key)} />)}
            </ul>
          )}
        </div>
      ) : phase === 'loading' ? (
        <div role="status" aria-label="Generating flashcards" className="space-y-3 pb-2">
          <p className="text-sm text-muted">Reading your course material and writing {count} cards...</p>
          {Array.from({ length: Math.min(count, 4) }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <form onSubmit={run} className="space-y-4 pb-2">
          {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
          <div>
            <Input ref={topicRef} label="Topic" required minLength={2} maxLength={120} autoFocus placeholder="e.g. Trees, or List comprehensions" value={topic} onChange={(e) => setTopic(e.target.value)} />
            {titles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Topic suggestions">
                {titles.map((t) => (
                  <button key={t} type="button" onClick={() => setTopic(t.slice(0, 120))} className="max-w-full truncate rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:border-brand-400 hover:text-fg">{t}</button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Number of cards" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {COUNTS.map((n) => <option key={n} value={n}>{n} cards</option>)}
            </Select>
            <Select label="Use material up to" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
              {WEEKS.map((w) => <option key={w} value={w}>Up to week {w}</option>)}
            </Select>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={topic.trim().length < 2}><Sparkles className="size-4" /> Generate</Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
