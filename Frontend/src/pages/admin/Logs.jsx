/**
 * TODO(port): AI call log (admin).
 *
 * New page (no legacy component). Backend endpoints (wrappers in src/lib/services/admin.js): admin.getAILogs (GET /admin/ai/logs?limit=50); ai.getTrace (GET /ai/trace/{id}) via <UnderTheHood traceId/>
 * Build on: PageContainer/PageHeader from '@/components/layout/PageHeader', '@/components/ui'.
 * AI-call details: <UnderTheHood traceId=.../> from '@/components/ai'.
 */
import { ScrollText } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function AdminLogs() {
  return <Placeholder title="AI call log" description="Recent AI calls with prompts and retrieved context." icon={ScrollText} />
}
