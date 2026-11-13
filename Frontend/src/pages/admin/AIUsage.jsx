/**
 * TODO(port): AI usage (admin).
 *
 * New page (no legacy component). Backend endpoints (wrappers in src/lib/services/admin.js): admin.getAIUsage (GET /admin/ai/usage?days=7 - per day / per feature: requests, tokens in/out, avg latency_ms, errors, est. cost) - build charts
 * Build on: PageContainer/PageHeader from '@/components/layout/PageHeader', '@/components/ui'.
 * AI-call details: <UnderTheHood traceId=.../> from '@/components/ai'.
 */
import { Activity } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function AdminAIUsage() {
  return <Placeholder title="AI usage" description="Requests, tokens, latency and cost by day and feature." icon={Activity} />
}
