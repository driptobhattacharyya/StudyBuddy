// Lazy-loaded Monaco editor (bundled locally - no CDN). Import via React.lazy so Monaco only ships with the code editor page.
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/editor/editor.api'
import 'monaco-editor/languages/definitions/python/register'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/languages/definitions/java/register'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { Skeleton } from '@/components/ui/Skeleton'

// Editor worker bundled by Vite (no CDN, works offline). Only the base editor worker is needed for highlighting.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export default function CodeMonaco({ value, onChange, language, dark, readOnly, onRun }) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme={dark ? 'vs-dark' : 'vs'}
      onChange={(v) => onChange(v ?? '')}
      loading={<Skeleton className="h-full w-full rounded-none" />}
      onMount={(editor, m) => {
        // Ctrl/Cmd+Enter runs the public tests.
        editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => onRun?.())
      }}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbersMinChars: 3,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12 },
        wordWrap: 'on',
        ariaLabel: 'Code editor',
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    />
  )
}
