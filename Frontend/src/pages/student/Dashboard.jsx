import { Link } from 'react-router-dom'
import { BookOpen, CalendarClock, ClipboardList, Code2, Layers, MessagesSquare, RefreshCw, Sparkles, PlayCircle } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { useUpcomingDeadlines } from '@/lib/useDeadlines'
import { getErrorMessage } from '@/lib/api'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { CourseCard } from '@/components/CourseCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

function Deadlines() {
  const { loading, items } = useUpcomingDeadlines()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-brand-500" aria-hidden="true" /> Upcoming deadlines
        </CardTitle>
        <CardDescription>Assignments due soon across your courses.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg bg-surface-2 px-4 py-6 text-center text-sm text-muted">Nothing due - you are all caught up.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((d) => (
              <li key={d.assgn_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link
                    to={d.kind === 'coding' ? `/app/courses/${d.course_id}/code/${d.assgn_id}` : `/app/courses/${d.course_id}/assignments`}
                    className="block truncate text-sm font-medium text-fg hover:text-brand-600 hover:underline dark:hover:text-brand-300"
                  >
                    {d.title || `${d.assgn_type} - Week ${d.week}`}
                  </Link>
                  <p className="truncate text-xs text-muted">{d.assgn_type} · Week {d.week} · {d.course_name || d.course_id}{d.submitted ? ' · submitted' : ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-fg">{format(new Date(d.deadline), 'MMM d')}</p>
                  <p className="text-xs text-muted">in {formatDistanceToNowStrict(new Date(d.deadline))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { myCourses, loading, error, reload } = useCourses()
  const first = (user?.name || '').split(' ')[0]
  const featured = myCourses[0]?.course_id

  const links = (id) => [
    { label: 'Lectures', icon: PlayCircle, to: `/app/courses/${id}/lectures` },
    { label: 'Notes', icon: BookOpen, to: `/app/courses/${id}/notes` },
    { label: 'Assignments', icon: ClipboardList, to: `/app/courses/${id}/assignments` },
    { label: 'Code', icon: Code2, to: `/app/courses/${id}/code` },
    { label: 'Flashcards', icon: Layers, to: `/app/courses/${id}/flashcards` },
  ]

  return (
    <PageContainer>
      <PageHeader title={first ? `Welcome back, ${first}` : 'Welcome back'} description="Pick up where you left off, or ask the AI about anything in your courses." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 lg:col-span-2" aria-labelledby="courses-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="courses-h" className="text-lg font-semibold tracking-tight">
              My courses
            </h2>
            {!loading && <Badge>{myCourses.length}</Badge>}
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={RefreshCw}
              title="Could not load your courses"
              description={getErrorMessage(error)}
              action={<Button variant="outline" onClick={reload}>Try again</Button>}
            />
          ) : myCourses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Courses you are enrolled in will show up here." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {myCourses.map((c) => (
                <CourseCard key={c.course_id} course={c} to={`/app/courses/${c.course_id}/notes`} links={links(c.course_id)} />
              ))}
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <Deadlines />

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-600 to-accent-600 p-5 text-white">
              <Sparkles className="size-5" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold">Ask your course anything</h3>
              <p className="mt-1 text-sm text-white/80">Chat with an AI that answers from your own notes and materials.</p>
              <Button
                to={featured ? `/app/courses/${featured}/chat` : '/app'}
                variant="secondary"
                size="sm"
                className="mt-4 bg-white text-brand-700 hover:bg-white/90"
                aria-disabled={!featured}
              >
                <MessagesSquare className="size-4" aria-hidden="true" /> Open course chat
              </Button>
            </div>
          </Card>
          {featured && (
            <p className="px-1 text-xs text-muted">
              Shortcuts use <Link className="font-medium text-brand-600 hover:underline dark:text-brand-300" to={`/app/courses/${featured}/notes`}>{myCourses[0].course_name}</Link>.
            </p>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
