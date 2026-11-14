// Lazy-loaded Monaco editor (bundled locally - no CDN). Import via React.lazy so Monaco only ships with the code editor page.
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution'
import { Skeleton } from '@/components/ui/Skeleton'

// No language-service workers: syntax highlighting only, which runs fine on the main thread.
if (typeof self !== 'undefined' && !self.MonacoEnvironment) {
  self.MonacoEnvironment = {
    getWorker: () => new Worker(URL.createObjectURL(new Blob(['self.onmessage=()=>{}'], { type: 'text/javascript' }))),
  }
}
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
