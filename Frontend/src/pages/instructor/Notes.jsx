/**
 * TODO(port): Manage notes page.
 *
 * Replaces legacy component(s): src/legacy/components/instructor_Notes/InstructorNotes.jsx
 * Backend endpoints used (wrappers in src/lib/services): notes.getNotes, notes.createNote (POST /notes/create {course_id,title,content,url}), notes.updateNote, notes.deleteNote; courses.getCourses
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { BookOpen } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function InstructorNotes() {
  return <Placeholder title="Manage notes" description="Create and edit course notes for your students." icon={BookOpen} />
}
