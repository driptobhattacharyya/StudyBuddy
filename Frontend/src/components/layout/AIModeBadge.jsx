import { Sparkles } from 'lucide-react'
import { useAuthConfig } from '@/lib/useAuthConfig'
import { Badge } from '@/components/ui/Badge'

/** Small top-bar badge shown when the backend answers with the offline mock AI provider (AI_PROVIDER=mock). */
export function AIModeBadge() {
  const { ai_provider } = useAuthConfig()
  if (ai_provider !== 'mock') return null
  return (
    <Badge variant="warning" className="hidden sm:inline-flex" title="No AI API key is configured: AI features return deterministic canned responses.">
      <Sparkles className="size-3" aria-hidden="true" /> AI: mock responses
    </Badge>
  )
}
