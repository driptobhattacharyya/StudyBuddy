import { Hammer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { PageContainer, PageHeader } from './PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'

/** Temporary body for feature pages that are waiting to be ported from src/legacy. */
export function Placeholder({ title, description, icon = Hammer }) {
  const { courseId } = useParams()
  return (
    <PageContainer>
      <PageHeader title={title} description={description} actions={courseId && <Badge variant="brand">{courseId}</Badge>} />
      <EmptyState
        icon={icon}
        title="This page is being rebuilt"
        description="The new design for this feature is coming soon. The navigation, auth and API layer are ready."
      />
    </PageContainer>
  )
}
