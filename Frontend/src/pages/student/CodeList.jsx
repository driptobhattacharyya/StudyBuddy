/**
 * TODO(port): Coding assignments page.
 *
 * Replaces legacy component(s): src/legacy/components/Code/Questions.jsx
 * Backend endpoints used (wrappers in src/lib/services): coding.getCodingAssignments (GET /course/get_all_assignment?course_id&week&assgn_type PPA|GrPA). Links to ./:assignmentId (CodeEditor page)
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { Code2 } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function StudentCodeList() {
  return <Placeholder title="Coding assignments" description="Programming problems with an in-browser editor and test cases." icon={Code2} />
}
