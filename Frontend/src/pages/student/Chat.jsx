/**
 * Course chat (RAG over the course material) - fully ported.
 * Replaces legacy: src/legacy/components/GenAI/GenAI.jsx and ContextAI/ContextAI.jsx.
 * Uses WebSocket /search_generate via <ChatPanel>. Citations come back as a trailing "Sources:" list.
 */
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
import { WS_COURSE_CHAT } from '@/lib/services/ai'
import { ChatPanel } from '@/components/ai/ChatPanel'
import { loadCourseContents } from '@/lib/courseContents'
import { Select } from '@/components/ui/Field'
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
  // Retrieval covers material "up to week N". Default = the course's latest week that has material.
  const [week, setWeek] = useState(12)
  useEffect(() => {
    let alive = true
    loadCourseContents(courseId)
      .then((d) => {
        const ws = (d?.materials ?? []).map((m) => m.week).filter((w) => Number.isInteger(w))
        if (alive && ws.length) setWeek(Math.min(12, Math.max(...ws)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [courseId])
  const buildPayload = useCallback((query) => ({ query, course_id: courseId, week }), [courseId, week])

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col p-3 sm:p-6">
      <PageHeader
        className="mb-4"
        actions={
          <Select aria-label="Use course material up to week" className="h-9 w-44" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Up to week {w}</option>
            ))}
          </Select>
        }
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
