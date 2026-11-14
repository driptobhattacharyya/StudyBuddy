import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { getHint } from '@/lib/services/ai'
import { getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Markdown } from './Markdown'
import { UnderTheHood } from './UnderTheHood'

/**
 * Socratic hint for an assignment (POST /ai/hint). The server looks the assignment up itself, so correct answers and
 * hidden tests are never part of anything the browser sends or receives.
 */
export function HintBox({ assgnId, getCode, getMessage, again = false }) {
  const [state, setState] = useState({ loading: false, data: null, error: null, used: false })
  const ask = async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await getHint({ assgnId, code: getCode?.(), message: getMessage?.() })
      setState({ loading: false, data, error: null, used: true })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(e) }))
    }
  }
  return (
    <div>
      <Button size="sm" variant="outline" loading={state.loading} onClick={ask}>
        <Lightbulb className="size-4" /> {again && state.used ? 'Another hint' : 'Hint'}
      </Button>
      {state.loading && <div className="mt-2 space-y-2" role="status" aria-label="Thinking of a hint"><Skeleton className="h-4" /><Skeleton className="h-4 w-3/4" /></div>}
      {(state.data || state.error) && !state.loading && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10" aria-live="polite">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Hint</p>
          {state.data && <Markdown className="prose-sm">{state.data.hint}</Markdown>}
          {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
          {state.data?.trace_id && <div className="mt-1 flex justify-end"><UnderTheHood traceId={state.data.trace_id} /></div>}
        </div>
      )}
    </div>
  )
}
