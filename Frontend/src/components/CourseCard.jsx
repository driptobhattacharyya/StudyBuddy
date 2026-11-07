import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const ACCENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-fuchsia-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
]
const accentFor = (id = '') => ACCENTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % ACCENTS.length]

/** <CourseCard course={{course_id, course_name}} to="..." links={[{label, to, icon}]} /> */
export function CourseCard({ course, to, links = [] }) {
  return (
    <Card interactive className="group relative flex flex-col overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${accentFor(course.course_id)}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="brand">{course.course_id}</Badge>
          <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-fg">
          <Link to={to} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.course_name}
          </Link>
        </h3>
        {links.length > 0 && (
          <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-4">
            {links.map(({ label, to: href, icon: Icon }) => (
              <Link
                key={label}
                to={href}
                className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/15 dark:hover:text-brand-200"
              >
                {Icon && <Icon className="size-3.5" aria-hidden="true" />}
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
