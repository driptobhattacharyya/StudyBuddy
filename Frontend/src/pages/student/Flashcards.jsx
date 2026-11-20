/**
 * Flashcards. Replaces legacy Flashcard/*.
 * Endpoints: GET /user/get/course/{course_id} -> [{ _id, course_id, week, title, content }]; POST /flash_card/create;
 * PUT /flash_card/update/{id}; DELETE /flash_card/delete/{id}; POST /flash_card/generate_deck + /create_many (see DeckGenerator).
 * Study mode keeps a simple Leitner schedule per card in localStorage (sb:srs:{courseId}).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, Check, GraduationCap, Layers, Pencil, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { createFlashcard, deleteFlashcard, getFlashcardsByCourse, updateFlashcard } from '@/lib/services/flashcards'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useLocalState } from '@/lib/useLocalState'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { FlipCard, Markdown } from '@/components/ai'
import { DeckGenerator } from './DeckGenerator'

const DAY = 86400e3
const INTERVALS = [0, 1, 3, 7, 14] // days per Leitner box
const idOf = (c) => c._id ?? c.id
const WEEKS = Array.from({ length: 13 }, (_, i) => i)
const wk = (w) => (w ? `Week ${w}` : 'General')

function CardFormDialog({ open, onOpenChange, card, defaultWeek, onSave }) {
  const [form, setForm] = useState({ title: '', content: '', week: defaultWeek })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open) setForm({ title: card?.title ?? '', content: card?.content ?? '', week: card?.week ?? defaultWeek })
  }, [open, card, defaultWeek])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await onSave({ ...form, week: Number(form.week) })
      onOpenChange(false)
    } catch (err) {
      toast.error('Could not save the flashcard', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={card ? 'Edit flashcard' : 'New flashcard'}>
      <form onSubmit={submit} className="space-y-4 pb-2">
        <Input label="Front (term or question)" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea label="Back (answer or explanation)" rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <Select label="Week" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })}>
          {WEEKS.map((w) => <option key={w} value={w}>{wk(w)}</option>)}
        </Select>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" loading={busy}>{card ? 'Save changes' : 'Create card'}</Button>
        </div>
      </form>
    </Dialog>
  )
}

function StudyMode({ cards, srs, setSrs, onExit, paused }) {
  const [now] = useState(() => Date.now())
  const order = useMemo(() => {
    return [...cards]
      .sort((a, b) => {
        const sa = srs[idOf(a)] ?? { box: 0, due: 0 }
        const sb = srs[idOf(b)] ?? { box: 0, due: 0 }
        const da = sa.due <= now ? 0 : 1
        const db = sb.due <= now ? 0 : 1
        return da - db || sa.box - sb.box || sa.due - sb.due
      })
      .map(idOf)
    // order is fixed for the session on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [queue, setQueue] = useState(order)
  const [known, setKnown] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const byId = useMemo(() => new Map(cards.map((c) => [idOf(c), c])), [cards])
  const total = order.length
  const current = byId.get(queue[0])
  const finished = queue.length === 0

  const mark = useCallback(
    (didKnow) => {
      if (!queue.length) return
      const id = queue[0]
      setSrs((prev) => {
        const box = didKnow ? Math.min((prev[id]?.box ?? 0) + 1, INTERVALS.length - 1) : 0
        return { ...prev, [id]: { box, due: Date.now() + INTERVALS[box] * DAY } }
      })
      setFlipped(false)
      if (didKnow) { setKnown((k) => k + 1); setQueue((q) => q.slice(1)) }
      else setQueue((q) => [...q.slice(1), id]) // see it again before the session ends
    },
    [queue, setSrs],
  )

  useEffect(() => {
    if (paused) return
    const onKey = (e) => {
      if (e.target.closest?.('input,textarea,select,[role=dialog]')) return
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) }
      else if (e.key === 'ArrowRight') mark(true)
      else if (e.key === 'ArrowLeft') mark(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mark, paused])

  const restart = () => { setQueue(order); setKnown(0); setFlipped(false) }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}><X className="size-4" /> Exit</Button>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={known} aria-label="Study progress">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-300" style={{ width: `${total ? (known / total) * 100 : 0}%` }} />
          </div>
        </div>
        <span className="text-sm tabular-nums text-muted">{known}/{total}</span>
      </div>

      {finished ? (
        <EmptyState icon={GraduationCap} title="Session complete" description={`You went through all ${total} cards. Cards you struggled with will come back sooner next time.`}
          action={<div className="flex gap-2"><Button variant="outline" onClick={restart}><RotateCcw className="size-4" /> Study again</Button><Button onClick={onExit}>Back to deck</Button></div>} />
      ) : (
        <>
          <FlipCard
            className="h-72 sm:h-80"
            flipped={flipped}
            onFlip={setFlipped}
            label={current.title}
            topLeft={<Badge variant="brand">{wk(current.week)}</Badge>}
            front={<span className="text-xl sm:text-2xl"><Markdown inline>{current.title}</Markdown></span>}
            back={<Markdown className="prose-sm">{current.content || '_No answer written yet._'}</Markdown>}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant="outline" size="lg" onClick={() => mark(false)}><X className="size-5 text-red-500" /> Don&apos;t know <kbd className="hidden text-xs text-subtle sm:inline">&larr;</kbd></Button>
            <Button size="lg" onClick={() => mark(true)}><Check className="size-5" /> I know it <kbd className="hidden text-xs text-white/70 sm:inline">&rarr;</kbd></Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">{queue.length} left in this session. Space flips, arrow keys mark.</p>
        </>
      )}
    </div>
  )
}

export default function StudentFlashcards() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [state, setState] = useState({ loading: true, cards: [], error: null })
  const [week, setWeek] = useState('all')
  const [srs, setSrs] = useLocalState(`sb:srs:${courseId}`, {})
  const [studying, setStudying] = useState(false)
  const [flipped, setFlipped] = useState(() => new Set())
  const [editing, setEditing] = useState(null) // card | 'new'
  const [genOpen, setGenOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [delBusy, setDelBusy] = useState(false)

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    getFlashcardsByCourse(courseId)
      .then((d) => setState({ loading: false, cards: Array.isArray(d) ? d : [], error: null }))
      .catch((e) => {
        toast.error('Could not load flashcards', { description: getErrorMessage(e) })
        setState({ loading: false, cards: [], error: getErrorMessage(e) })
      })
  }, [courseId])
  useEffect(() => { load() }, [load])

  const weeks = useMemo(() => [...new Set(state.cards.map((c) => c.week))].sort((a, b) => a - b), [state.cards])
  const shown = state.cards.filter((c) => week === 'all' || c.week === Number(week))
  const groups = useMemo(() => {
    const m = new Map()
    for (const c of shown) m.set(c.week, [...(m.get(c.week) ?? []), c])
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [shown])
  const allFlipped = shown.length > 0 && shown.every((c) => flipped.has(idOf(c)))
  const [now] = useState(() => Date.now())
  const dueCount = shown.filter((c) => (srs[idOf(c)]?.due ?? 0) <= now).length
  const defaultWeek = week === 'all' ? 1 : Number(week)

  const save = async (form) => {
    if (editing && editing !== 'new') {
      await updateFlashcard(idOf(editing), { week: form.week, title: form.title, content: form.content })
      setState((s) => ({ ...s, cards: s.cards.map((c) => (idOf(c) === idOf(editing) ? { ...c, ...form } : c)) }))
      toast.success('Flashcard updated')
    } else {
      const res = await createFlashcard({ course_id: courseId, ...form })
      const id = res?.db_entry_id ?? res?._id
      setState((s) => ({ ...s, cards: [{ _id: id ?? `tmp-${Date.now()}`, course_id: courseId, ...form }, ...s.cards] }))
      toast.success('Flashcard created')
      if (!id) load()
    }
  }
  const remove = async () => {
    setDelBusy(true)
    try {
      await deleteFlashcard(idOf(deleting))
      setState((s) => ({ ...s, cards: s.cards.filter((c) => idOf(c) !== idOf(deleting)) }))
      toast.success('Flashcard deleted')
      setDeleting(null)
    } catch (e) {
      toast.error('Could not delete', { description: getErrorMessage(e) })
    } finally {
      setDelBusy(false)
    }
  }

  const actions = (
    <>
      <Button variant="outline" onClick={() => setGenOpen(true)}><Sparkles className="size-4" /> Generate with AI</Button>
      <Button variant="outline" onClick={() => setEditing('new')}><Plus className="size-4" /> New card</Button>
      <Button onClick={() => setStudying(true)} disabled={shown.length === 0}><GraduationCap className="size-4" /> Study{shown.length ? ` (${shown.length})` : ''}</Button>
    </>
  )

  return (
    <PageContainer>
      <PageHeader title="Flashcards" description={`Your cards for ${currentCourse?.course_name ?? courseId}. Study with spaced repetition.`} actions={studying ? null : actions} />

      {studying ? (
        <StudyMode cards={shown} srs={srs} setSrs={setSrs} onExit={() => setStudying(false)} paused={!!editing || genOpen} />
      ) : state.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading flashcards">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : state.error ? (
        <EmptyState icon={AlertCircle} title="Could not load flashcards" description={state.error} action={<Button variant="outline" onClick={load}><RefreshCw className="size-4" /> Retry</Button>} />
      ) : state.cards.length === 0 ? (
        <EmptyState icon={Layers} title="No flashcards yet" description="Create your own, or let the AI draft one from your course material."
          action={<div className="flex flex-wrap justify-center gap-2"><Button onClick={() => setGenOpen(true)}><Sparkles className="size-4" /> Generate with AI</Button><Button variant="outline" onClick={() => setEditing('new')}><Plus className="size-4" /> New card</Button></div>} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Select aria-label="Filter by week" className="w-44" value={week} onChange={(e) => setWeek(e.target.value)}>
              <option value="all">All weeks</option>
              {weeks.map((w) => <option key={w} value={w}>{wk(w)}</option>)}
            </Select>
            <p className="text-sm text-muted">{shown.length} card{shown.length === 1 ? '' : 's'} - {dueCount} due for review</p>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setFlipped(allFlipped ? new Set() : new Set(shown.map(idOf)))}>
              {allFlipped ? <><RotateCcw className="size-4" /> Reset</> : <><Layers className="size-4" /> Flip all</>}
            </Button>
          </div>
          {groups.map(([w, cardsIn]) => (
            <section key={w} className="mb-8" aria-labelledby={`wk-${w}`}>
              <h2 id={`wk-${w}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-subtle">{wk(w)} <span className="font-normal normal-case">({cardsIn.length})</span></h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardsIn.map((c) => (
              <li key={idOf(c)}>
                <FlipCard
                  className="h-52"
                  flipped={flipped.has(idOf(c))}
                  onFlip={(f) => setFlipped((prev) => { const n = new Set(prev); if (f) n.add(idOf(c)); else n.delete(idOf(c)); return n })}
                  label={c.title}
                  topLeft={<Badge variant="brand">{wk(c.week)}</Badge>}
                  topRight={c.shared ? <Badge>From your instructor</Badge> : <>
                    <button type="button" aria-label={`Edit ${c.title}`} onClick={() => setEditing(c)} className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button>
                    <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                  </>}
                  front={<Markdown inline>{c.title}</Markdown>}
                  back={c.content ? <Markdown className="prose-sm">{c.content}</Markdown> : <span className="italic text-muted">No answer written yet.</span>}
                />
                {srs[idOf(c)] && <p className="mt-1.5 text-xs text-subtle">Box {srs[idOf(c)].box + 1} of {INTERVALS.length}</p>}
              </li>
            ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <CardFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} card={editing === 'new' ? null : editing} defaultWeek={defaultWeek} onSave={save} />
      <DeckGenerator open={genOpen} onOpenChange={setGenOpen} courseId={courseId} onSaved={load} />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this flashcard?" description={deleting?.title}
        footer={<><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="danger" loading={delBusy} onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-muted">This cannot be undone.</p>
      </Dialog>
    </PageContainer>
  )
}
