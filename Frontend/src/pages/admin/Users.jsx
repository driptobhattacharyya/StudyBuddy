/**
 * TODO(port): Users (admin).
 *
 * New page (no legacy component). Backend endpoints (wrappers in src/lib/services/admin.js): admin.getUsers (GET /admin/users - list with role + course count); admin.setUserRole (PATCH /admin/users/{email}/role {role})
 * Build on: PageContainer/PageHeader from '@/components/layout/PageHeader', '@/components/ui'.
 * AI-call details: <UnderTheHood traceId=.../> from '@/components/ai'.
 */
import { Users } from 'lucide-react'
import { Placeholder } from '@/components/layout/Placeholder'

export default function AdminUsers() {
  return <Placeholder title="Users" description="Review accounts and change roles." icon={Users} />
}
