/**
 * TODO(port): Notes page.
 *
 * Replaces legacy component(s): src/legacy/components/Notes/Notes.jsx (+ Notes/SummarizeButton.jsx, GenerateButton.jsx, DownloadButton.jsx)
 * Backend endpoints used (wrappers in src/lib/services): notes.getNotes (GET /notes/get/{course_id}); ai.summarize (POST /summarize); ai.generateQuestions (POST /generate_questions); jspdf for PDF download
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { BookOpen } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function StudentNotes() {
  return <Placeholder title="Notes" description="Read course notes, get AI summaries and practice questions." icon={BookOpen} />
}
