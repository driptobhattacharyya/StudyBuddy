import { Suspense, lazy } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Skeleton } from '@/components/ui/Skeleton'

const Monaco = lazy(() => import('@monaco-editor/react'))

const MONACO_LANG = { python: 'python', java: 'java', js: 'javascript', javascript: 'javascript' }

/** Lazy-loaded Monaco editor (loaded only when first rendered). */
export function CodeBox({ value, onChange, language = 'python', height = 260, label }) {
  const { theme } = useTheme()
  return (
    <div className="overflow-hidden rounded-lg border border-border-strong" role="group" aria-label={label}>
      <Suspense fallback={<Skeleton className="rounded-none" style={{ height }} />}>
        <Monaco
          height={height}
          language={MONACO_LANG[language] ?? 'plaintext'}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          loading={<Skeleton className="rounded-none" style={{ height }} />}
          options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4, padding: { top: 8 } }}
        />
      </Suspense>
    </div>
  )
}
