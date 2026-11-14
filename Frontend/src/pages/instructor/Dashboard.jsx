import { useState } from 'react'
import { BookOpen, ClipboardList, Code2, GraduationCap, Pencil, Plus, RefreshCw, Table2 } from 'lucide-react'
import { createCourse, updateCourse } from '@/lib/services/courses'
import { toast } from '@/lib/toast'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Field'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { CourseCard } from '@/components/CourseCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

function CourseDialog({ course, onClose, onSaved }) {
  const [id, setId] = useState(course?.course_id ?? '')
  const [name, setName] = useState(course?.course_name ?? '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(id.trim())) errs.id = 'Use 2-20 letters, numbers, - or _ (e.g. CS3001).'
    if (!name.trim()) errs.name = 'Course name is required.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const body = { course_id: id.trim(), course_name: name.trim() }
      if (course) await updateCourse(course.course_id, body)
      else await createCourse(body)
      toast.success(course ? 'Course updated' : 'Course created')
      onSaved()
    } catch (err) {
      toast.error('Could not save course', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()} title={course ? 'Edit course' : 'New course'}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="course-form" loading={busy}>{course ? 'Save changes' : 'Create course'}</Button></>}>
      <form id="course-form" onSubmit={save} noValidate className="space-y-4">
        <Input label="Course ID" required value={id} onChange={(e) => setId(e.target.value)} error={errors.id} disabled={!!course} placeholder="CS3001" autoFocus={!course} />
        <Input label="Course name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Introduction to Algorithms" autoFocus={!!course} />
      </form>
    </Dialog>
  )
}

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
  const [dialog, setDialog] = useState(null)
  const first = (user?.name || '').split(' ')[0]
  const links = (id) => [
    { label: 'Notes', icon: BookOpen, to: `/instructor/courses/${id}/notes` },
    { label: 'Assignments', icon: ClipboardList, to: `/instructor/courses/${id}/assignments` },
    { label: 'Code', icon: Code2, to: `/instructor/courses/${id}/code` },
    { label: 'Gradebook', icon: Table2, to: `/instructor/courses/${id}/gradebook` },
  ]

  return (
    <PageContainer>
      <PageHeader title={first ? `Hello, ${first}` : 'Instructor dashboard'} description="Manage course notes, assignments and programming problems for your students." actions={<Button onClick={() => setDialog({})}><Plus className="size-4" /> New course</Button>} />

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
        <EmptyState icon={GraduationCap} title="No courses yet" description="Create your first course to start adding notes and assignments." action={<Button onClick={() => setDialog({})}><Plus className="size-4" /> New course</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.course_id} className="relative">
              <CourseCard course={c} to={`/instructor/courses/${c.course_id}/notes`} links={links(c.course_id)} />
              <Button variant="outline" size="icon" aria-label={`Edit ${c.course_name}`} onClick={() => setDialog({ course: c })} className="absolute right-10 top-4 z-10 size-7">
                <Pencil className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {dialog && <CourseDialog course={dialog.course} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload() }} />}
    </PageContainer>
  )
}
