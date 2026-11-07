/**
 * TODO(port): Code editor page.
 *
 * Replaces legacy component(s): src/legacy/components/Code/Code.jsx (Monaco editor, run, AI hints via GenAI websocket)
 * Backend endpoints used (wrappers in src/lib/services): coding.getCodingAssignment (GET /coding_assignment/get/{id}); coding.runCode (POST /coding_assignment/run, base64 code); ai.WS_ASSISTANT + ai.buildHintQuery via useAIStream for hints (@monaco-editor/react is installed)
 *
 * Build on: '@/components/layout/PageHeader' (PageContainer, PageHeader), '@/components/ui', '@/components/ai',
 * '@/context/CoursesContext' (useCourses), route param `courseId` via useParams().
 */
import { Code2 } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function StudentCodeEditor() {
  return <Placeholder title="Code editor" description="Write, run and test your solution." icon={Code2} />
}
