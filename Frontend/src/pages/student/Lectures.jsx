/**
 * Student lectures: week tabs, the week's lectures as sub-tabs, an embedded YouTube player, then the
 * lecture's notes / description / resources. "Watched" progress is per browser (localStorage).
 * Endpoint: GET /lecture/get/{course_id}
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ClipboardList, ExternalLink, PlayCircle, RefreshCw, Video } from 'lucide-react'
import { getLectures } from '@/lib/services/lectures'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useLocalState } from '@/lib/useLocalState'
import { embedUrl, groupByWeek } from '@/lib/youtube'
import { useCourses } from '@/context/CoursesContext'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonVariants } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent } from '@/components/ui/Tabs'
import { Markdown } from '@/components/ai'

function Player({ lecture }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-slate-950">
      <iframe
        key={lecture.youtube_id}
        src={embedUrl(lecture.youtube_id)}
        title={lecture.title}
        className="absolute inset-0 size-full"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        allowFullScreen
      />
    </div>
  )
}

function LectureList({ lectures, current, watched, onSelect }) {
  return (
    <ol className="space-y-1" aria-label="Lectures this week">
      {lectures.map((l, i) => {
        const active = l._id === current._id
        const done = watched.includes(l._id)
        return (
          <li key={l._id}>
            <button
              type="button"
              onClick={() => onSelect(l)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-brand-500',
                active ? 'border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10' : 'border-transparent hover:bg-surface-2',
              )}
            >
              <span className={cn('mt-0.5 shrink-0', done ? 'text-emerald-600 dark:text-emerald-400' : active ? 'text-brand-600 dark:text-brand-300' : 'text-subtle')}>
                {done ? <CheckCircle2 className="size-4" /> : active ? <PlayCircle className="size-4" /> : <Circle className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-subtle">Lecture {i + 1}{l.duration ? ` · ${l.duration}` : ''}</span>
                <span className={cn('block text-sm leading-snug text-fg', active && 'font-semibold')}>{l.title}</span>
                {l.source && <span className="mt-0.5 block truncate text-xs text-muted">{l.source}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default function StudentLectures() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [params, setParams] = useSearchParams()
  const [lectures, setLectures] = useState(null)
  const [error, setError] = useState(null)
  const [watched, setWatched] = useLocalState(`sb_watched_${courseId}`, [])
  const [detail, setDetail] = useState('notes')

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
  const ordered = useMemo(() => weeks.flatMap(([, list]) => list), [weeks])
  const current = ordered.find((l) => l._id === params.get('lecture')) ?? ordered.find((l) => !watched.includes(l._id)) ?? ordered[0]
  const position = current ? ordered.indexOf(current) : -1
  const weekLectures = current ? weeks.find(([w]) => w === current.week)?.[1] ?? [] : []
  const isWatched = current ? watched.includes(current._id) : false
  const next = ordered[position + 1]

  useEffect(() => {
    if (current) setDetail(current.notes ? 'notes' : 'about')
    // Pin the auto-picked lecture in the URL so marking it watched doesn't jump to the next one.
    if (current && params.get('lecture') !== current._id) setParams({ lecture: current._id }, { replace: true })
  }, [current?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (l) => {
    setParams({ lecture: l._id }, { replace: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const mark = (id, value) => setWatched((list) => (value ? [...new Set([...list, id])] : list.filter((x) => x !== id)))
  const doneCount = ordered.filter((l) => watched.includes(l._id)).length

  const detailTabs = current
    ? [
        ...(current.notes ? [{ value: 'notes', label: 'Lecture notes' }] : []),
        { value: 'about', label: 'About' },
        ...(current.resources?.length ? [{ value: 'resources', label: `Resources (${current.resources.length})` }] : []),
      ]
    : []

  return (
    <PageContainer wide>
      <PageHeader
        title="Lectures"
        description={
          ordered.length
            ? `${currentCourse?.course_name ?? courseId}: ${doneCount} of ${ordered.length} lectures watched.`
            : `Video lectures for ${currentCourse?.course_name ?? courseId}, week by week.`
        }
      />

      {lectures === null ? (
        <div className="space-y-4"><Skeleton className="h-11" /><div className="grid gap-6 lg:grid-cols-[18rem_1fr]"><Skeleton className="h-64" /><Skeleton className="aspect-video" /></div></div>
      ) : error ? (
        <EmptyState icon={RefreshCw} title="Could not load lectures" description={getErrorMessage(error)} action={<Button variant="outline" onClick={load}>Try again</Button>} />
      ) : !current ? (
        <EmptyState
          icon={Video}
          title="No lectures yet"
          description="Your instructor hasn't added any videos to this course. The notes and practice questions are a good place to start."
          action={<Link className={buttonVariants({ variant: 'outline' })} to={`/app/courses/${courseId}/notes`}>Open notes</Link>}
        />
      ) : (
        <Tabs
          value={String(current.week)}
          onValueChange={(w) => select(weeks.find(([wk]) => String(wk) === w)[1][0])}
          items={weeks.map(([w, list]) => ({
            value: String(w),
            label: (
              <span className="inline-flex items-center gap-1.5">
                Week {w}
                {list.every((l) => watched.includes(l._id)) && <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label="all watched" />}
              </span>
            ),
          }))}
        >
          <TabsContent value={String(current.week)} className="pt-5">
            <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-20 lg:self-start">
                <p className="px-1 text-xs font-medium uppercase tracking-wide text-subtle">
                  {weekLectures.filter((l) => watched.includes(l._id)).length} of {weekLectures.length} watched
                </p>
                <LectureList lectures={weekLectures} current={current} watched={watched} onSelect={select} />
                <Link
                  to={`/app/courses/${courseId}/assignments?week=${current.week}`}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-sm text-muted transition-colors hover:border-brand-300 hover:text-fg"
                >
                  <ClipboardList className="size-4 shrink-0" />
                  <span>Done with week {current.week}? <span className="font-medium text-brand-600 dark:text-brand-300">Try the questions</span></span>
                </Link>
              </aside>

              <section className="min-w-0" aria-labelledby="lecture-title">
                <Player lecture={current} />
                <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="brand">Week {current.week} · Lecture {weekLectures.indexOf(current) + 1}</Badge>
                    <h2 id="lecture-title" className="mt-2 text-xl font-semibold tracking-tight text-fg sm:text-2xl">{current.title}</h2>
                    {current.source && <p className="mt-1 text-sm text-muted">Video by {current.source}</p>}
                  </div>
                  <Button variant={isWatched ? 'secondary' : 'outline'} size="sm" onClick={() => mark(current._id, !isWatched)} aria-pressed={isWatched}>
                    {isWatched ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> : <Circle className="size-4" />}
                    {isWatched ? 'Watched' : 'Mark as watched'}
                  </Button>
                </div>

                <Tabs key={current._id} value={detail} onValueChange={setDetail} items={detailTabs} className="mt-5">
                  <TabsContent value="notes">{current.notes && <Markdown>{current.notes}</Markdown>}</TabsContent>
                  <TabsContent value="about">
                    <p className="text-sm leading-relaxed text-fg">{current.description || <span className="text-muted">No description for this lecture.</span>}</p>
                  </TabsContent>
                  <TabsContent value="resources">
                    <ul className="space-y-2">
                      {current.resources?.map((r, i) => (
                        <li key={`${i}-${r.url}`}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-300">
                            {r.label} <ExternalLink className="size-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                  <Button variant="ghost" disabled={position <= 0} onClick={() => select(ordered[position - 1])}>
                    <ArrowLeft className="size-4" /> Previous
                  </Button>
                  {next ? (
                    <Button onClick={() => { mark(current._id, true); select(next) }}>
                      {next.week !== current.week ? `Done, on to week ${next.week}` : 'Done, next lecture'} <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button variant={isWatched ? 'secondary' : 'primary'} onClick={() => mark(current._id, true)} disabled={isWatched}>
                      {isWatched ? "That's the last lecture" : 'Mark the last lecture done'}
                    </Button>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  )
}
