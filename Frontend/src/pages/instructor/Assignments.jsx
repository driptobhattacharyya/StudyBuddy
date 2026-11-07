/**
 * TODO(port): Manage assignments page.
 *
 * Replaces legacy component(s): src/legacy/components/instructor_GA/GA_instructor.jsx
 * Backend endpoints used (wrappers in src/lib/services): assignments.createAssignment (POST /assignment/create {question,q_type,options,answers,assgn_type,course_id,week,evaluated,deadline}); assignments.getAssignments; updateAssignment; deleteAssignment
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { ClipboardList } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function InstructorAssignments() {
  return <Placeholder title="Manage assignments" description="Author questions for practice and graded assignments." icon={ClipboardList} />
}
