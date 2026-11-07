import { BookOpen, ClipboardList, Code2, GraduationCap, RefreshCw } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { CourseCard } from '@/components/CourseCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </Card>
  )
}

export default function InstructorDashboard() {
  const { user } = useAuth()
  const { courses, loading, error, reload } = useCourses()
  const first = (user?.name || '').split(' ')[0]
  const links = (id) => [
    { label: 'Notes', icon: BookOpen, to: `/instructor/courses/${id}/notes` },
    { label: 'Assignments', icon: ClipboardList, to: `/instructor/courses/${id}/assignments` },
    { label: 'Code', icon: Code2, to: `/instructor/courses/${id}/code` },
  ]

  return (
    <PageContainer>
      <PageHeader title={first ? `Hello, ${first}` : 'Instructor dashboard'} description="Manage course notes, assignments and programming problems for your students." />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={GraduationCap} label="Courses" value={loading ? '-' : courses.length} />
        <Stat icon={ClipboardList} label="Assignment types" value="3" />
        <Stat icon={Code2} label="Languages supported" value="3" />
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight">Your courses</h2>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title="Could not load courses"
          description={getErrorMessage(error)}
          action={<Button variant="outline" onClick={reload}>Try again</Button>}
        />
      ) : courses.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No courses yet" description="Courses created in the backend will appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.course_id} course={c} to={`/instructor/courses/${c.course_id}/notes`} links={links(c.course_id)} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
