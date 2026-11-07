/**
 * TODO(port): Code assignments page.
 *
 * Replaces legacy component(s): src/legacy/components/instructor_coding_assignment/Code_instructor.jsx
 * Backend endpoints used (wrappers in src/lib/services): coding.createCodingAssignment (POST /coding_assignment/create_programming_question {question,language,public_testcase,private_testcase,assgn_type,course_id,week,evaluated,deadline}); getCodingAssignments; updateCodingAssignment; deleteCodingAssignment
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { Code2 } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function InstructorCode() {
  return <Placeholder title="Code assignments" description="Create programming problems with public and private test cases." icon={Code2} />
}
