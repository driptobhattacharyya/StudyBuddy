import { lazy, Suspense } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Skeleton } from '@/components/ui/Skeleton'

// Reuse the locally bundled Monaco (no CDN): the same lazy chunk the student editor uses.
const CodeMonaco = lazy(() => import('@/components/CodeMonaco'))

const MONACO_LANG = { python: 'python', java: 'java', js: 'javascript', javascript: 'javascript' }

/** Lazy-loaded Monaco editor for instructor forms. */
export function CodeBox({ value, onChange, language = 'python', height = 260, label }) {
  const { theme } = useTheme()
  return (
    <div className="overflow-hidden rounded-lg border border-border-strong" role="group" aria-label={label}>
      <Suspense fallback={<Skeleton className="rounded-none" style={{ height }} />}>
        <CodeMonaco value={value} onChange={onChange} language={MONACO_LANG[language] ?? 'plaintext'} dark={theme === 'dark'} height={height} fontSize={13} label={label} />
      </Suspense>
    </div>
  )
}
