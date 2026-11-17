/**
 * Student notes reader. Replaces legacy Notes/Notes.jsx (+ SummarizeButton, GenerateButton, DownloadButton).
 * Endpoints: GET /notes/get/{course_id}; POST /summarize {text}; POST /generate_questions {text};
 * WS /search_generate (quick chat about a note); jsPDF for the PDF download.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { BookOpen, Download, FileText, ListChecks, MessageCircleQuestion, RefreshCw, Sparkles } from 'lucide-react'
import { getCourseMaterial, getNotes } from '@/lib/services/notes'
import { summarizeFull, generateQuestionsFull, WS_COURSE_CHAT } from '@/lib/services/ai'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { stripLeadingTitle } from '@/lib/markdown'
import { Markdown, PracticeQuiz, ChatPanel, UnderTheHood } from '@/components/ai'

const idOf = (n) => n._id ?? n.id ?? n.title
const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*?>/i.test(s || '')

function sanitize(html) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'] })
  return clean.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ')
}

function toPlainText(content) {
  if (!looksLikeHtml(content)) return content || ''
  const doc = new DOMParser().parseFromString(sanitize(content).replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '$&\n'), 'text/html')
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

async function downloadPdf(note) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const height = pdf.internal.pageSize.getHeight() - margin
  let y = margin
  pdf.setFont('helvetica', 'bold').setFontSize(18)
  for (const line of pdf.splitTextToSize(note.title, width)) {
    pdf.text(line, margin, y)
    y += 24
  }
  y += 6
  pdf.setFont('helvetica', 'normal').setFontSize(11)
  for (const line of pdf.splitTextToSize(toPlainText(note.content), width)) {
    if (y > height) {
      pdf.addPage()
      y = margin
    }
    pdf.text(line, margin, y)
    y += 16
  }
  pdf.save(`${note.title.replace(/[^\w-]+/g, '_').slice(0, 60) || 'note'}.pdf`)
}

function NoteBody({ note }) {
  const html = useMemo(() => (looksLikeHtml(note.content) ? sanitize(note.content) : null), [note.content])
  if (html != null) {
    return (
      <div
        className="prose prose-slate max-w-none break-words dark:prose-invert prose-img:rounded-lg prose-a:text-brand-600 dark:prose-a:text-brand-300 prose-pre:overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return <Markdown>{stripLeadingTitle(note.content, note.title)}</Markdown>
}

const weekLabel = (w) => (w ? `Week ${w}` : 'General')

/** A one-shot AI call shown in a dialog: runs on open, supports retry, shows Under the hood. */
function AIResultDialog({ open, onOpenChange, title, description, run, render }) {
  const [state, setState] = useState({ loading: false, data: null, error: null })
  const exec = useCallback(async () => {
    setState({ loading: true, data: null, error: null })
    try {
      setState({ loading: false, data: await run(), error: null })
    } catch (e) {
      const message = getErrorMessage(e)
      toast.error('AI request failed', { description: message })
      setState({ loading: false, data: null, error: message })
    }
  }, [run])
  useEffect(() => {
    if (open) exec()
  }, [open, exec])
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} className="max-w-2xl">
      <div className="min-h-32 pb-2" aria-live="polite">
        {state.loading && (
          <div className="space-y-3" role="status" aria-label="Generating">
            <p className="flex items-center gap-2 text-sm text-muted"><Spinner /> The AI is working on it...</p>
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-24" />
          </div>
        )}
        {state.error && (
          <div className="space-y-3">
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{state.error}</p>
            <Button size="sm" variant="outline" onClick={exec}><RefreshCw className="size-4" /> Try again</Button>
          </div>
        )}
        {state.data && render(state.data, exec)}
      </div>
    </Dialog>
  )
}

function NoteReader({ note, courseId }) {
  const { user } = useAuth()
  const [panel, setPanel] = useState(null) // 'summary' | 'quiz' | 'ask'
  const [pdfBusy, setPdfBusy] = useState(false)
  const text = useMemo(() => toPlainText(note.content), [note.content])
  const close = (v) => !v && setPanel(null)

  const buildPayload = useCallback(
    (query) => ({ query: `About the course note "${note.title}": ${query}`, course_id: courseId, week: note.week ?? 12 }),
    [note.title, note.week, courseId],
  )

  const onPdf = async () => {
    setPdfBusy(true)
    try {
      await downloadPdf({ title: note.title, content: stripLeadingTitle(note.content, note.title) })
      toast.success('PDF downloaded')
    } catch {
      toast.error('Could not create the PDF')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <article className="min-w-0">
      <header className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{weekLabel(note.week)}</Badge>
          {note.url && (
            <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-300">
              Source link
            </a>
          )}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-fg">{note.title}</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setPanel('summary')}><Sparkles className="size-4" /> Summarise</Button>
          <Button size="sm" variant="outline" onClick={() => setPanel('quiz')}><ListChecks className="size-4" /> Practice questions</Button>
          <Button size="sm" variant="outline" onClick={() => setPanel('ask')}><MessageCircleQuestion className="size-4" /> Ask AI</Button>
          <Button size="sm" variant="ghost" onClick={onPdf} loading={pdfBusy}><Download className="size-4" /> Download PDF</Button>
        </div>
      </header>
      <div className="pt-6">
        <NoteBody note={note} />
      </div>

      <AIResultDialog
        key={`s-${idOf(note)}`}
        open={panel === 'summary'}
        onOpenChange={close}
        title="AI summary"
        description={note.title}
        run={() => summarizeFull(text)}
        render={(d, retry) => (
          <>
            <Markdown>{d.summary}</Markdown>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <Button size="sm" variant="ghost" onClick={retry}><RefreshCw className="size-3.5" /> Regenerate</Button>
              <UnderTheHood traceId={d.trace_id} />
            </div>
          </>
        )}
      />
      <AIResultDialog
        key={`q-${idOf(note)}`}
        open={panel === 'quiz'}
        onOpenChange={close}
        title="Practice questions"
        description="Pick an answer or reveal it. Generated by AI from this note."
        run={() => generateQuestionsFull(text)}
        render={(d, retry) => (
          <>
            <PracticeQuiz questions={d.questions} traceId={d.trace_id} />
            <Button size="sm" variant="outline" className="mt-2" onClick={retry}><RefreshCw className="size-3.5" /> New questions</Button>
          </>
        )}
      />
      <Dialog open={panel === 'ask'} onOpenChange={close} title="Ask AI about this note" description={note.title} className="max-w-2xl">
        <div className="flex h-[60dvh] min-h-80 flex-col">
          <ChatPanel
            key={idOf(note)}
            path={WS_COURSE_CHAT}
            buildPayload={buildPayload}
            user={user}
            title="Ask about this note"
            description="Answers draw on your course material."
            suggestions={['Explain this in simple terms', 'What are the key takeaways?', 'Give me an example']}
            className="min-h-0 flex-1"
          />
        </div>
      </Dialog>
    </article>
  )
}

function Sidebar({ groups, activeId, onSelect }) {
  return (
    <nav aria-label="Notes by week" className="space-y-4">
      {groups.map(([week, items]) => (
        <div key={week}>
          <h2 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">{weekLabel(week)}</h2>
          <ul className="space-y-0.5">
            {items.map((n) => (
              <li key={idOf(n)}>
                <button
                  onClick={() => onSelect(idOf(n))}
                  aria-current={activeId === idOf(n) ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                    activeId === idOf(n)
                      ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <FileText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{n.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export default function StudentNotes() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState({ loading: true, notes: [], error: null })

  const load = useCallback(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    // Notes live in two places: the notes collection and course_material rows of type "notes" (what the demo seed uses).
    Promise.allSettled([getNotes(courseId), getCourseMaterial(courseId)])
      .then(([n, m]) => {
        if (!alive) return
        if (n.status === 'rejected' && m.status === 'rejected') throw n.reason
        const fromNotes = n.status === 'fulfilled' && Array.isArray(n.value) ? n.value : []
        const fromMaterial = (m.status === 'fulfilled' && Array.isArray(m.value) ? m.value : [])
          .filter((x) => x.material_type === 'notes' && x.content)
          .map((x) => ({ _id: x._id, course_id: x.course_id, title: x.title || `Week ${x.week} notes`, content: x.content, week: x.week, url: x.url }))
        const seen = new Set()
        const notes = [...fromNotes, ...fromMaterial].filter((x) => !seen.has(idOf(x)) && seen.add(idOf(x)))
        setState({ loading: false, notes, error: null })
      })
      .catch((e) => {
        if (!alive) return
        toast.error('Could not load notes', { description: getErrorMessage(e) })
        setState({ loading: false, notes: [], error: getErrorMessage(e) })
      })
    return () => {
      alive = false
    }
  }, [courseId])
  useEffect(() => load(), [load])

  const groups = useMemo(() => {
    const map = new Map()
    for (const n of state.notes) {
      const w = n.week ?? 0
      if (!map.has(w)) map.set(w, [])
      map.get(w).push(n)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [state.notes])

  const activeId = params.get('note') || (state.notes[0] && idOf(state.notes[0]))
  const active = state.notes.find((n) => idOf(n) === activeId) ?? state.notes[0]
  const select = (id) => setParams({ note: id }, { replace: true })

  return (
    <PageContainer wide>
      <PageHeader title="Notes" description={`Read, summarise and practise from ${currentCourse?.course_name ?? 'your course'} notes.`} actions={<Badge variant="brand">{courseId}</Badge>} />

      {state.loading ? (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]" role="status" aria-label="Loading notes">
          <div className="hidden space-y-3 lg:block">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div>
          <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-9 w-80 max-w-full" /><Skeleton className="h-4" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-48" /></div>
        </div>
      ) : state.error ? (
        <EmptyState icon={BookOpen} title="Could not load notes" description={state.error} action={<Button variant="outline" onClick={load}><RefreshCw className="size-4" /> Retry</Button>} />
      ) : state.notes.length === 0 ? (
        <EmptyState icon={BookOpen} title="No notes yet" description="Your instructor has not published any notes for this course." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1">
              <Sidebar groups={groups} activeId={idOf(active)} onSelect={select} />
            </div>
          </aside>
          <div className="lg:hidden">
            <Select aria-label="Choose a note" value={idOf(active)} onChange={(e) => select(e.target.value)}>
              {groups.map(([w, items]) => (
                <optgroup key={w} label={weekLabel(w)}>
                  {items.map((n) => <option key={idOf(n)} value={idOf(n)}>{n.title}</option>)}
                </optgroup>
              ))}
            </Select>
          </div>
          <Card className="min-w-0 p-5 sm:p-8">
            <NoteReader key={idOf(active)} note={active} courseId={courseId} />
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
