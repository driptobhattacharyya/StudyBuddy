import { useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown, GraduationCap } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

/** Top-bar course picker. Keeps the current feature (notes/assignments/...) when switching courses. */
export function CourseSwitcher({ base }) {
  const { myCourses, currentCourse, courseId, loading } = useCourses()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const go = (id) => {
    const m = pathname.match(/\/courses\/[^/]+\/([^/]+)/)
    navigate(`${base}/courses/${id}/${m ? m[1] : 'notes'}`)
  }

  if (loading) return <Skeleton className="h-9 w-36 sm:w-52" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Switch course"
          className="flex h-9 min-w-0 max-w-[11rem] items-center gap-2 rounded-lg border border-border-strong bg-surface px-2.5 text-sm shadow-sm transition-colors hover:bg-surface-2 sm:max-w-xs"
        >
          <GraduationCap className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
          <span className="truncate font-medium">
            {currentCourse ? currentCourse.course_name : courseId ? courseId : 'Courses'}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Your courses</DropdownMenuLabel>
        {myCourses.length === 0 && <p className="px-2.5 py-3 text-sm text-muted">No courses available yet.</p>}
        {myCourses.map((c) => (
          <DropdownMenuItem key={c.course_id} onSelect={() => go(c.course_id)}>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate', c.course_id === courseId && 'font-semibold')}>{c.course_name}</p>
              <p className="text-xs text-muted">{c.course_id}</p>
            </div>
            {c.course_id === courseId && <Check className="size-4 text-brand-500" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
