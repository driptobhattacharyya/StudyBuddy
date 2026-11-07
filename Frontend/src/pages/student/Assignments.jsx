/**
 * TODO(port): Assignments page.
 *
 * Replaces legacy component(s): src/legacy/components/Assignment/Assignment.jsx
 * Backend endpoints used (wrappers in src/lib/services): assignments.getAssignments (GET /course/get_assignment?course_id&week&assgn_type AQ|PA|GA); assignments.submitAnswers (POST /user/submit_answers); assignments.getMarks; assignments.getLastSubmission; ai.generateAssignmentQuestions (POST /generate_assignment_questions)
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { ClipboardList } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function StudentAssignments() {
  return <Placeholder title="Assignments" description="Practice and graded assignments by week." icon={ClipboardList} />
}
