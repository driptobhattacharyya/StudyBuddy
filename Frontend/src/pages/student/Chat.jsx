/**
 * Course chat (RAG over the course material) - fully ported.
 * Replaces legacy: src/legacy/components/GenAI/GenAI.jsx and ContextAI/ContextAI.jsx.
 * Uses WebSocket /search_generate via <ChatPanel>. Citations come back as a trailing "Sources:" list.
 */
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { WS_COURSE_CHAT } from '@/lib/services/ai'
import { ChatPanel } from '@/components/ai/ChatPanel'
import { PageHeader } from '@/components/layout/PageHeader'

const SUGGESTIONS = [
  'Summarise the key ideas from the latest week',
  'Explain the hardest concept in this course simply',
  'Quiz me with 3 practice questions',
  'What should I revise before the next assignment?',
]

export default function StudentChat() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const { currentCourse } = useCourses()
  // The legacy API required a `week`; 12 means "whole course".
  const buildPayload = useCallback((query) => ({ query, course_id: courseId, week: 12 }), [courseId])

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col p-3 sm:p-6">
      <PageHeader
        className="mb-4"
        title="Course chat"
        description={`Ask questions about ${currentCourse?.course_name ?? 'this course'} - answers are grounded in your course material.`}
      />
      <ChatPanel
        key={courseId}
        path={WS_COURSE_CHAT}
        buildPayload={buildPayload}
        suggestions={SUGGESTIONS}
        user={user}
        title="Chat with your course"
        description="Ask about concepts, request explanations or get quizzed. Sources are shown with each answer."
      />
    </div>
  )
}
