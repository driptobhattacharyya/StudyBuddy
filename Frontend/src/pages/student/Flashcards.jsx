/**
 * Flashcards. Replaces legacy Flashcard/*.
 * Endpoints: GET /user/get/course/{course_id} -> [{ _id, course_id, week, title, content }]; POST /flash_card/create;
 * PUT /flash_card/update/{id}; DELETE /flash_card/delete/{id}; POST /flash_card/generate { course_id, week, title, content:'' } -> card (+ trace_id?).
 * Study mode keeps a simple Leitner schedule per card in localStorage (sb:srs:{courseId}).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, Check, GraduationCap, Layers, Pencil, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { createFlashcard, deleteFlashcard, generateFlashcard, getFlashcardsByCourse, updateFlashcard } from '@/lib/services/flashcards'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { useLocalState } from '@/lib/useLocalState'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Markdown, UnderTheHood } from '@/components/ai'

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

function GenerateDialog({ open, onOpenChange, courseId, defaultWeek, onCreated }) {
  const [topic, setTopic] = useState('')
  const [week, setWeek] = useState(defaultWeek)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  useEffect(() => { if (open) { setTopic(''); setDone(null); setWeek(defaultWeek) } }, [open, defaultWeek])
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const card = await generateFlashcard({ courseId, week: Number(week), topic: topic.trim() })
      onCreated(card)
      setDone(card)
      toast.success('Flashcard generated')
    } catch (err) {
      toast.error('Could not generate the flashcard', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Generate with AI" description="Name a topic and the AI writes a flashcard from your course material.">
      {done ? (
        <div className="space-y-3 pb-2" aria-live="polite">
          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <p className="font-medium"><Markdown inline>{done.title}</Markdown></p>
            <div className="mt-2 text-sm text-muted"><Markdown className="prose-sm">{done.content}</Markdown></div>
          </div>
          <div className="flex items-center justify-between">
            <UnderTheHood traceId={done.trace_id} />
            <div className="flex gap-2"><Button variant="outline" onClick={() => { setDone(null); setTopic('') }}>Another</Button><Button onClick={() => onOpenChange(false)}>Done</Button></div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 pb-2">
          <Input label="Topic" required maxLength={200} placeholder="e.g. Binary search trees" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Select label="Week" hint="Used to pull the right part of the course material." value={week} onChange={(e) => setWeek(e.target.value)}>
            {WEEKS.map((w) => <option key={w} value={w}>{wk(w)}</option>)}
          </Select>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={busy} disabled={!topic.trim()}><Sparkles className="size-4" /> Generate</Button>
          </div>
        </form>
      )}
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
          <button
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? 'Showing the answer. Press space to flip back.' : 'Showing the question. Press space to reveal the answer.'}
            className="block h-72 w-full rounded-2xl text-left [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 sm:h-80"
          >
            <div className="relative h-full w-full transition-transform duration-500 motion-reduce:duration-0" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-2xl border border-border bg-surface p-6 text-center shadow-pop" style={{ backfaceVisibility: 'hidden' }}>
                <Badge variant="brand" className="mb-4">{wk(current.week)}</Badge>
                <p className="break-words text-xl font-semibold tracking-tight sm:text-2xl"><Markdown inline>{current.title}</Markdown></p>
                <p className="mt-4 text-xs text-subtle">Tap or press space to flip</p>
              </div>
              <div className="absolute inset-0 overflow-auto rounded-2xl border border-brand-300 bg-brand-50 p-6 shadow-pop dark:border-brand-500/40 dark:bg-brand-500/10" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="flex min-h-full items-center justify-center text-center text-[15px]">{flipped ? <Markdown className="prose-sm">{current.content || '_No answer written yet._'}</Markdown> : null}</div>
              </div>
            </div>
          </button>
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
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <li key={idOf(c)}>
                <Card className="group flex h-full flex-col p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="brand">{wk(c.week)}</Badge>
                    {c.shared ? <Badge>From your instructor</Badge> : <div className="flex gap-0.5">
                      <button aria-label={`Edit ${c.title}`} onClick={() => setEditing(c)} className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button>
                      <button aria-label={`Delete ${c.title}`} onClick={() => setDeleting(c)} className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                    </div>}
                  </div>
                  <h2 className="mt-3 break-words font-semibold leading-snug tracking-tight"><Markdown inline>{c.title}</Markdown></h2>
                  <p className={cn('mt-1.5 line-clamp-4 break-words text-sm text-muted', !c.content && 'italic')}>{c.content ? <Markdown inline>{c.content}</Markdown> : 'No answer written yet.'}</p>
                  {srs[idOf(c)] && <p className="mt-auto pt-3 text-xs text-subtle">Box {srs[idOf(c)].box + 1} of {INTERVALS.length}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <CardFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} card={editing === 'new' ? null : editing} defaultWeek={defaultWeek} onSave={save} />
      <GenerateDialog open={genOpen} onOpenChange={setGenOpen} courseId={courseId} defaultWeek={defaultWeek} onCreated={(c) => setState((s) => ({ ...s, cards: [c, ...s.cards] }))} />
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete this flashcard?" description={deleting?.title}
        footer={<><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="danger" loading={delBusy} onClick={remove}>Delete</Button></>}>
        <p className="text-sm text-muted">This cannot be undone.</p>
      </Dialog>
    </PageContainer>
  )
}
