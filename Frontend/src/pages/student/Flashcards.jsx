/**
 * TODO(port): Flashcards page.
 *
 * Replaces legacy component(s): src/legacy/components/Flashcard/* (FlashcardList, Flashcard, FlashCardCreate, EditFlashCard, generate.js)
 * Backend endpoints used (wrappers in src/lib/services): flashcards.getFlashcardsByCourse / getMyFlashcards; createFlashcard; updateFlashcard; deleteFlashcard; generateFlashcard (POST /flash_card/generate)
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { Layers } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function StudentFlashcards() {
  return <Placeholder title="Flashcards" description="Create, edit and AI-generate flashcards for this course." icon={Layers} />
}
