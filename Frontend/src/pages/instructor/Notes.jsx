import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BookOpen, Layers, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { createNote, deleteCourseMaterial, deleteNote, getCourseMaterial, getNotes, updateCourseMaterial, updateNote } from '@/lib/services/notes'
import { createFlashcard } from '@/lib/services/flashcards'
import { generateFromMaterial } from '@/lib/services/ai'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Markdown } from '@/components/ai/Markdown'
import { UnderTheHood } from '@/components/ai/UnderTheHood'
import { ConfirmDialog } from '@/components/instructor/Confirm'
import { MarkdownEditor } from '@/components/instructor/MarkdownEditor'
import { QuizDraft } from '@/components/instructor/QuizDraft'
import { WeekSelect } from '@/components/instructor/WeekFilter'
import { WEEKS, idOf } from '@/components/instructor/utils'

const stripMd = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/[#*_`>\-[\]]/g, '').replace(/\s+/g, ' ').trim()

function NoteEditor({ note, courseId, onClose, onSaved }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [week, setWeek] = useState(note?.week ?? 1)
  const [content, setContent] = useState(note?.content ?? '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!title.trim()) errs.title = 'Title is required.'
    if (!content.trim()) errs.content = 'Content cannot be empty.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const body = { title: title.trim(), content, week }
      if (note?._src === 'material') await updateCourseMaterial(idOf(note), { ...body, material_type: 'notes', url: note.url ?? null })
      else if (note) await updateNote(idOf(note), body)
      else await createNote({ ...body, course_id: courseId })
      toast.success(note ? 'Note updated' : 'Note created')
      onSaved()
    } catch (err) {
      toast.error('Could not save note', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={note ? 'Edit note' : 'New note'}
      description="Notes are shown to students and used to ground the course chat."
      className="max-w-5xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="note-form" loading={busy}>{note ? 'Save changes' : 'Create note'}</Button>
        </>
      }
    >
      <form id="note-form" onSubmit={save} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={200} autoFocus />
          <WeekSelect value={week} onChange={setWeek} />
        </div>
        <MarkdownEditor label="Content" required value={content} onChange={setContent} error={errors.content} />
      </form>
    </Dialog>
  )
}

function AIAssist({ notes, initialNote, courseId, onClose }) {
  const [source, setSource] = useState(initialNote ? idOf(initialNote) : notes[0] ? idOf(notes[0]) : '')
  const [pasted, setPasted] = useState('')
  const [count, setCount] = useState(4)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(null)
  const [summary, setSummary] = useState('')
  const [cards, setCards] = useState([])
  const [publishing, setPublishing] = useState(false)
  const note = notes.find((n) => idOf(n) === source)
  const text = source ? note?.content ?? '' : pasted

  const generate = async () => {
    if (text.trim().length < 20) return toast.error('Provide a note or at least a few sentences of text')
    setBusy(true)
    try {
      const d = await generateFromMaterial({ text, n_questions: count, course_id: courseId })
      setDraft({ ...d, quiz: d.quiz ?? [] })
      setSummary(d.summary ?? '')
      setCards((d.flashcards ?? []).map((c, i) => ({ key: i, title: c.title ?? c.front ?? '', content: c.content ?? c.back ?? '' })))
    } catch (e) {
      toast.error('AI generation failed', { description: getErrorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const week = note?.week ?? 1
  const publishCards = async () => {
    setPublishing(true)
    try {
      await Promise.all(cards.map((c) => createFlashcard({ course_id: courseId, week, title: c.title, content: c.content })))
      toast.success(`Created ${cards.length} flashcard${cards.length === 1 ? '' : 's'}`)
      setCards([])
    } catch (e) {
      toast.error('Could not create flashcards', { description: getErrorMessage(e) })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="AI assist" description="Draft a summary, quiz and flashcards from course material. Review, edit, then publish." className="max-w-3xl">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <Select label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Paste text instead</option>
            {notes.map((n) => <option key={idOf(n)} value={idOf(n)}>{n.title}</option>)}
          </Select>
          <Select label="Questions" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[2, 4, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        {!source && <Textarea aria-label="Pasted text" rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste lecture notes or a transcript..." />}
        <Button onClick={generate} loading={busy}><Sparkles className="size-4" /> {draft ? 'Regenerate' : 'Generate draft'}</Button>

        {busy && !draft && <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-32" /></div>}

        {draft && (
          <div className="space-y-6 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-fg">AI draft</h3>
              <UnderTheHood traceId={draft.trace_id} />
            </div>
            <section>
              <h4 className="mb-2 text-sm font-semibold">Summary</h4>
              <Textarea aria-label="Summary" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
              <details className="mt-2 text-sm text-muted"><summary className="cursor-pointer">Preview</summary><Markdown className="mt-2">{summary}</Markdown></details>
            </section>
            <section>
              <h4 className="mb-2 text-sm font-semibold">Quiz questions</h4>
              <QuizDraft key={draft.trace_id ?? text} initial={draft.quiz} courseId={courseId} defaultWeek={week} />
            </section>
            <section>
              <h4 className="mb-2 text-sm font-semibold">Flashcards</h4>
              {cards.length === 0 ? (
                <p className="text-sm text-muted">No flashcards in this draft.</p>
              ) : (
                <div className="space-y-2">
                  {cards.map((c) => (
                    <div key={c.key} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                      <Input aria-label="Flashcard title" value={c.title} onChange={(e) => setCards((l) => l.map((x) => (x.key === c.key ? { ...x, title: e.target.value } : x)))} />
                      <div className="flex gap-2">
                        <Textarea aria-label="Flashcard content" rows={2} className="min-h-10" wrapperClassName="flex-1" value={c.content} onChange={(e) => setCards((l) => l.map((x) => (x.key === c.key ? { ...x, content: e.target.value } : x)))} />
                        <Button variant="ghost" size="icon" aria-label="Discard flashcard" onClick={() => setCards((l) => l.filter((x) => x.key !== c.key))}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={publishCards} loading={publishing} disabled={cards.some((c) => !c.title.trim() || !c.content.trim())}>
                    <Layers className="size-4" /> Create {cards.length} flashcard{cards.length === 1 ? '' : 's'} (week {week})
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Dialog>
  )
}

export default function InstructorNotes() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState(null)
  const [week, setWeek] = useState('')
  const [q, setQ] = useState('')
  const [editor, setEditor] = useState(null) // { note? }
  const [assist, setAssist] = useState(null) // { note? }
  const [del, setDel] = useState(null)
  const [preview, setPreview] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      // Notes live in /notes, but material of type "notes" (e.g. imported / seeded) is shown and editable too.
      const [a, b] = await Promise.allSettled([getNotes(courseId), getCourseMaterial(courseId)])
      if (a.status === 'rejected' && b.status === 'rejected') throw a.reason
      const own = a.status === 'fulfilled' ? a.value : []
      const mat = (b.status === 'fulfilled' ? b.value : []).filter((m) => m.material_type === 'notes' && m.content)
      setNotes([...own.map((n) => ({ ...n, _src: 'notes' })), ...mat.map((m) => ({ ...m, title: m.title || `Week ${m.week} notes`, _src: 'material' }))])
    } catch (e) {
      setError(e)
      setNotes([])
    }
  }, [courseId])
  useEffect(() => {
    setNotes(null)
    load()
  }, [load])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (notes ?? [])
      .filter((n) => (week === '' ? true : n.week === week))
      .filter((n) => !term || n.title?.toLowerCase().includes(term) || stripMd(n.content).toLowerCase().includes(term))
      .sort((a, b) => (a.week ?? 99) - (b.week ?? 99))
  }, [notes, week, q])

  return (
    <PageContainer>
      <PageHeader
        title="Notes"
        description={`Course material for ${currentCourse?.course_name ?? courseId}, organised by week.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setAssist({})} disabled={!notes}><Wand2 className="size-4" /> AI assist</Button>
            <Button onClick={() => setEditor({})}><Plus className="size-4" /> New note</Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input aria-label="Search notes" placeholder="Search notes..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Filter by week" value={week} onChange={(e) => setWeek(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">All weeks</option>
          {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </Select>
      </div>

      {notes === null ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState icon={RefreshCw} title="Could not load notes" description={getErrorMessage(error)} action={<Button variant="outline" onClick={load}>Try again</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={notes.length ? 'No notes match your filters' : 'No notes yet'}
          description={notes.length ? 'Try a different week or search term.' : 'Create the first note, or let AI draft material from pasted text.'}
          action={!notes.length && <Button onClick={() => setEditor({})}><Plus className="size-4" /> New note</Button>}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>li]:min-w-0">
          {shown.map((n) => (
            <li key={idOf(n)}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-brand-500" onClick={() => setPreview(n)}>
                    <h3 className="truncate text-base font-semibold tracking-tight text-fg hover:text-brand-600 dark:hover:text-brand-300">{n.title}</h3>
                  </button>
                  <Badge variant="brand" className="shrink-0">{n.week != null ? `Week ${n.week}` : 'General'}</Badge>
                </div>
                <p className="mt-2 line-clamp-3 flex-1 break-words text-sm text-muted">{stripMd(n.content) || 'Empty note'}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                  <Button size="sm" variant="ghost" onClick={() => setAssist({ note: n })}><Sparkles className="size-4" /> AI assist</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditor({ note: n })}><Pencil className="size-4" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400" aria-label={`Delete ${n.title}`} onClick={() => setDel(n)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editor && <NoteEditor note={editor.note} courseId={courseId} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load() }} />}
      {assist && <AIAssist notes={notes ?? []} initialNote={assist.note} courseId={courseId} onClose={() => setAssist(null)} />}
      {preview && (
        <Dialog open onOpenChange={(o) => !o && setPreview(null)} title={preview.title} description={preview.week != null ? `Week ${preview.week}` : undefined} className="max-w-3xl"
          footer={<Button variant="outline" onClick={() => { setEditor({ note: preview }); setPreview(null) }}><Pencil className="size-4" /> Edit</Button>}>
          <Markdown>{preview.content}</Markdown>
        </Dialog>
      )}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this note?"
        description={del ? `"${del.title}" will be removed for all students.` : ''}
        onConfirm={async () => {
          try {
            if (del._src === 'material') await deleteCourseMaterial(idOf(del))
            else await deleteNote(idOf(del))
            toast.success('Note deleted')
            load()
          } catch (e) {
            toast.error('Could not delete note', { description: getErrorMessage(e) })
            throw e
          }
        }}
      />
    </PageContainer>
  )
}
