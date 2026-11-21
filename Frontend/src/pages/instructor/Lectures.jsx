/**
 * Instructor lectures: add, edit, reorder and remove YouTube lectures per week.
 * Endpoints: GET /lecture/get/{course_id}; POST /lecture/create; PUT /lecture/update/{id}; DELETE /lecture/delete/{id}
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2, Video } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { createLecture, deleteLecture, getLectures, updateLecture } from '@/lib/services/lectures'
import { embedUrl, groupByWeek, thumbUrl, watchUrl, youtubeId } from '@/lib/youtube'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tooltip } from '@/components/ui/Tooltip'
import { ConfirmDialog } from '@/components/instructor/Confirm'
import { MarkdownEditor } from '@/components/instructor/MarkdownEditor'
import { WeekSelect } from '@/components/instructor/WeekFilter'
import { idOf } from '@/components/instructor/utils'

// Resources are edited as one "Label | https://link" per line.
const parseResources = (text) =>
  text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.lastIndexOf('|')
    const label = i === -1 ? line : line.slice(0, i).trim()
    const url = i === -1 ? line : line.slice(i + 1).trim()
    return { label: label || url, url }
  })
const resourcesText = (list = []) => list.map((r) => `${r.label} | ${r.url}`).join('\n')

/** YouTube thumbnail; falls back to an icon when the image can't load (deleted/private video, offline). */
function Thumb({ id }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-md bg-surface-2 text-subtle" aria-hidden="true">
        <Video className="size-5" />
      </div>
    )
  }
  return <img src={thumbUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} className="aspect-video w-28 shrink-0 rounded-md bg-surface-2 object-cover" />
}

function LectureEditor({ lecture, defaults, courseId, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    title: lecture?.title ?? '',
    youtube_url: lecture?.youtube_url ?? '',
    week: lecture?.week ?? defaults.week,
    order: lecture?.order ?? defaults.order,
    duration: lecture?.duration ?? '',
    source: lecture?.source ?? '',
    description: lecture?.description ?? '',
    notes: lecture?.notes ?? '',
    resources: resourcesText(lecture?.resources),
  }))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }))
  const vid = youtubeId(f.youtube_url)

  const save = async (e) => {
    e.preventDefault()
    const resources = parseResources(f.resources)
    const errs = {}
    if (!f.title.trim()) errs.title = 'Give the lecture a title.'
    if (!vid) errs.youtube_url = f.youtube_url.trim() ? "That isn't a YouTube link we recognise." : 'Paste a YouTube link.'
    if (resources.some((r) => !/^https?:\/\//.test(r.url))) errs.resources = 'Each line needs a link starting with http:// or https://'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const body = {
      title: f.title.trim(), youtube_url: f.youtube_url.trim(), week: Number(f.week), order: Math.max(1, Number(f.order) || 1),
      duration: f.duration.trim() || null, source: f.source.trim() || null,
      description: f.description.trim() || null, notes: f.notes.trim() || null, resources,
    }
    setBusy(true)
    try {
      if (lecture) await updateLecture(idOf(lecture), body)
      else await createLecture({ ...body, course_id: courseId })
      toast.success(lecture ? 'Lecture updated' : 'Lecture added', { description: lecture ? undefined : 'Students can watch it now.' })
      onSaved()
    } catch (err) {
      toast.error('Could not save the lecture', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={lecture ? 'Edit lecture' : 'Add a lecture'}
      description="Paste any YouTube link: watch, youtu.be, embed and shorts links all work, and so do unlisted videos."
      className="max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="lecture-form" loading={busy}>{lecture ? 'Save changes' : 'Add lecture'}</Button>
        </>
      }
    >
      <form id="lecture-form" onSubmit={save} noValidate className="grid gap-5 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-4">
          <Input label="YouTube link" required autoFocus value={f.youtube_url} onChange={set('youtube_url')} error={errors.youtube_url}
                 placeholder="https://www.youtube.com/watch?v=..." />
          <Input label="Title" required value={f.title} onChange={set('title')} error={errors.title} maxLength={200} />
          <div className="grid gap-4 sm:grid-cols-3">
            <WeekSelect value={f.week} onChange={set('week')} />
            <Input label="Position in week" type="number" min={1} max={50} value={f.order} onChange={set('order')} />
            <Input label="Length" value={f.duration} onChange={set('duration')} placeholder="e.g. 45 min" maxLength={40} />
          </div>
          <Input label="Video by" value={f.source} onChange={set('source')} placeholder="e.g. MIT OpenCourseWare, or your name" maxLength={120} />
          <Textarea label="Short description" rows={2} value={f.description} onChange={set('description')} maxLength={2000}
                    hint="One or two sentences shown under the video." />
          <MarkdownEditor label="Lecture notes" value={f.notes} onChange={set('notes')} />
          <Textarea label="Resources" rows={3} value={f.resources} onChange={set('resources')} error={errors.resources}
                    placeholder={'Slides | https://example.com/slides.pdf\nProblem set | https://example.com/ps1'}
                    hint="Optional. One per line, as: label | link" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Preview</p>
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
            {vid ? (
              <iframe title="Video preview" src={embedUrl(vid)} className="size-full" allow="encrypted-media; picture-in-picture" allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" />
            ) : (
              <p className="px-4 text-center text-xs text-muted">The video appears here once you paste a link.</p>
            )}
          </div>
          {vid && <p className="text-xs text-muted">Check it&apos;s the right video. Some videos can only be played on YouTube itself; those show an error here and for students.</p>}
        </div>
      </form>
    </Dialog>
  )
}

export default function InstructorLectures() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [lectures, setLectures] = useState(null)
  const [error, setError] = useState(null)
  const [editor, setEditor] = useState(null) // { lecture?, defaults }
  const [del, setDel] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setLectures(await getLectures(courseId))
    } catch (e) {
      setError(e)
      setLectures([])
    }
  }, [courseId])
  useEffect(() => {
    setLectures(null)
    load()
  }, [load])

  const weeks = useMemo(() => groupByWeek(lectures), [lectures])
  const openNew = (week) => {
    const w = week ?? weeks.at(-1)?.[0] ?? 1
    const list = weeks.find(([x]) => x === w)?.[1] ?? []
    setEditor({ defaults: { week: w, order: (list.at(-1)?.order ?? 0) + 1 } })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Lectures"
        description={`YouTube lectures for ${currentCourse?.course_name ?? courseId}. Students see them in this order, week by week.`}
        actions={<Button onClick={() => openNew()} disabled={lectures === null}><Plus className="size-4" /> Add lecture</Button>}
      />

      {lectures === null ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState icon={RefreshCw} title="Could not load lectures" description={getErrorMessage(error)} action={<Button variant="outline" onClick={load}>Try again</Button>} />
      ) : weeks.length === 0 ? (
        <EmptyState icon={Video} title="No lectures yet" description="Start with the first video for week 1. You can reorder and edit lectures at any time."
                    action={<Button onClick={() => openNew(1)}><Plus className="size-4" /> Add the first lecture</Button>} />
      ) : (
        <div className="space-y-5">
          {weeks.map(([week, list]) => (
            <Card key={week} className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-fg">Week {week} <span className="font-normal text-muted">· {list.length} lecture{list.length === 1 ? '' : 's'}</span></h2>
                <Button size="sm" variant="ghost" onClick={() => openNew(week)}><Plus className="size-4" /> Add to week {week}</Button>
              </div>
              <ul className="divide-y divide-border">
                {list.map((l) => (
                  <li key={idOf(l)} className="flex items-center gap-4 px-5 py-3">
                    <Thumb key={l.youtube_id} id={l.youtube_id} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-fg">{l.order}. {l.title}</p>
                      <p className="truncate text-sm text-muted">
                        {[l.source, l.duration, l.notes ? 'has notes' : 'no notes yet', l.resources?.length ? `${l.resources.length} resource${l.resources.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Tooltip content="Open on YouTube">
                        <a href={watchUrl(l.youtube_id)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${l.title} on YouTube`}
                           className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
                          <ExternalLink className="size-4" />
                        </a>
                      </Tooltip>
                      <Button size="icon" variant="ghost" aria-label={`Edit ${l.title}`} onClick={() => setEditor({ lecture: l })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700 dark:text-red-400" aria-label={`Delete ${l.title}`} onClick={() => setDel(l)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {editor && (
        <LectureEditor lecture={editor.lecture} defaults={editor.defaults ?? {}} courseId={courseId}
                       onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load() }} />
      )}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Remove this lecture?"
        description={del ? `"${del.title}" will disappear from week ${del.week} for every student. The video stays on YouTube.` : ''}
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await deleteLecture(idOf(del))
            toast.success('Lecture removed')
            load()
          } catch (e) {
            toast.error('Could not remove the lecture', { description: getErrorMessage(e) })
            throw e
          }
        }}
      />
    </PageContainer>
  )
}
