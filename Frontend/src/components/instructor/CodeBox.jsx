import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Field'

const Monaco = lazy(() => import('@monaco-editor/react'))

const MONACO_LANG = { python: 'python', java: 'java', js: 'javascript', javascript: 'javascript' }

/** Lazy-loaded Monaco editor. Falls back to a plain textarea if Monaco cannot load (offline / blocked CDN). */
export function CodeBox({ value, onChange, language = 'python', height = 260, label }) {
  const { theme } = useTheme()
  const [failed, setFailed] = useState(false)
  const mounted = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => !mounted.current && setFailed(true), 7000)
    return () => clearTimeout(t)
  }, [])

  if (failed) {
    return (
      <Textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} style={{ height }} className="font-mono text-[13px]" />
    )
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border-strong" role="group" aria-label={label}>
      <Suspense fallback={<Skeleton className="rounded-none" style={{ height }} />}>
        <Monaco
          height={height}
          language={MONACO_LANG[language] ?? 'plaintext'}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={() => { mounted.current = true }}
          loading={<Skeleton className="rounded-none" style={{ height }} />}
          options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4, padding: { top: 8 }, ariaLabel: label }}
        />
      </Suspense>
    </div>
  )
}
