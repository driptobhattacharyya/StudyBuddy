/**
 * Coding problem page. Replaces legacy Code/Code.jsx.
 * Endpoints: GET /coding_assignment/get/{id} (incl. starter_code); POST /coding_assignment/run { assgn_id, code(base64), submit }:
 * Run (submit=false) = public tests only, nothing saved; Submit (submit=true) = public + hidden tests, saved and graded.
 * POST /coding_assignment/{id}/feedback { assgn_id, code(base64) } -> { feedback, trace_id }; POST /ai/hint { assgn_id, code } -> { hint }.
 */
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, isPast } from 'date-fns'
import { AlertCircle, ArrowLeft, Bot, CheckCircle2, Clock, FileText, Play, RefreshCw, Send, Terminal, XCircle } from 'lucide-react'
import { getCodeFeedback, getCodingAssignment, runCode } from '@/lib/services/coding'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/cn'
import { LANG_LABEL, monacoLang, setCodeStatus, titleOf } from '@/lib/codeStatus'
import { useLocalState } from '@/lib/useLocalState'
import { useTheme } from '@/context/ThemeContext'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogClose } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { HintBox, Markdown, UnderTheHood } from '@/components/ai'

const CodeMonaco = lazy(() => import('@/components/CodeMonaco'))

/** Plain textarea used if Monaco fails to load. */
function PlainEditor({ value, onChange, readOnly }) {
  return <textarea aria-label="Code editor" spellCheck={false} readOnly={readOnly} value={value} onChange={(e) => onChange(e.target.value)} className="h-full w-full resize-none bg-surface p-3 font-mono text-sm outline-none" />
}

class EditorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <PlainEditor {...this.props.fallbackProps} /> : this.props.children
  }
}

const STARTERS = {
  python: '# Read from standard input with input() and print your answer.\n\n',
  javascript: "// Read standard input, then console.log your answer.\nconst lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n\n",
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}\n',
}
const LANGUAGES = ['python', 'javascript', 'java']
const normLang = (l) => (l === 'js' ? 'javascript' : l)

const norm = (r) => ({
  input: r.input,
  expected: r.expected ?? r.expected_output,
  output: r.output,
  passed: r.passed ?? r.status === 'Pass',
  time_ms: r.time_ms,
  error: r.error,
  hidden: r.input === undefined && r.expected === undefined,
})

function Pre({ children, className }) {
  return <pre className={cn('max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-2 px-2 py-1.5 font-mono text-xs', className)}>{children === '' ? '(empty)' : children}</pre>
}

function ResultsTable({ title, rows }) {
  if (!rows?.length) return null
  const passed = rows.filter((r) => r.passed).length
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant={passed === rows.length ? 'success' : 'danger'}>{passed}/{rows.length} passed</Badge>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-subtle">
            <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Input</th><th className="px-3 py-2">Expected</th><th className="px-3 py-2">Output</th><th className="px-3 py-2">Time</th><th className="px-3 py-2">Result</th></tr>
          </thead>
          <tbody className="divide-y divide-border align-top">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                {r.hidden ? (
                  <td colSpan={3} className="px-3 py-2 text-xs italic text-muted">Hidden test{r.error ? ` - ${r.error}` : ''}</td>
                ) : (
                  <>
                    <td className="px-3 py-2"><Pre>{r.input}</Pre></td>
                    <td className="px-3 py-2"><Pre>{r.expected}</Pre></td>
                    <td className="px-3 py-2"><Pre className={r.passed ? '' : 'text-red-600 dark:text-red-300'}>{r.error ? r.error : r.output}</Pre></td>
                  </>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">{r.time_ms != null ? `${Math.round(r.time_ms)} ms` : '-'}</td>
                <td className="px-3 py-2">
                  {r.passed ? <Badge variant="success"><CheckCircle2 className="size-3" /> Pass</Badge> : <Badge variant="danger"><XCircle className="size-3" /> Fail</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AIHelp({ getCode, assgnId }) {
  const [fb, setFb] = useState({ loading: false, data: null })
  const askFeedback = async () => {
    setFb({ loading: true, data: null })
    try {
      setFb({ loading: false, data: await getCodeFeedback(assgnId, getCode()) })
    } catch (e) {
      toast.error('AI feedback failed', { description: getErrorMessage(e) })
      setFb({ loading: false, data: null })
    }
  }
  return (
    <section aria-labelledby="ai-help" className="rounded-xl border border-border bg-surface-2/40 p-4">
      <h3 id="ai-help" className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4 text-brand-500" aria-hidden="true" /> AI help</h3>
      <p className="mt-1 text-xs text-muted">Hints nudge you without giving away the solution.</p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <HintBox assgnId={assgnId} getCode={getCode} />
        <Button size="sm" variant="outline" loading={fb.loading} onClick={askFeedback}><Bot className="size-4" /> AI feedback on my code</Button>
      </div>
      {fb.loading && <div className="mt-3 space-y-2" role="status" aria-label="Reviewing your code"><Skeleton className="h-4" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-16" /></div>}
      {fb.data && (
        <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Feedback on your code</p>
          <Markdown className="prose-sm">{fb.data.feedback}</Markdown>
          <div className="flex justify-end"><UnderTheHood traceId={fb.data.trace_id} /></div>
        </div>
      )}
    </section>
  )
}

function Problem({ problem, assgnId, getCode }) {
  const tests = (problem.public_testcase ?? [])
  return (
    <div className="space-y-5">
      <div>
        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert"><Markdown className="prose-sm">{problem.question}</Markdown></div>
      </div>
      {tests.length > 0 && (
        <section aria-labelledby="examples">
          <h3 id="examples" className="mb-2 text-sm font-semibold">Public test cases</h3>
          <div className="space-y-2">
            {tests.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3 text-xs">
                <p className="mb-1 font-medium text-muted">Example {i + 1}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><p className="mb-1 text-subtle">Input</p><Pre>{t.input}</Pre></div>
                  <div><p className="mb-1 text-subtle">Expected output</p><Pre>{t.output}</Pre></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <AIHelp getCode={getCode} assgnId={assgnId} />
    </div>
  )
}

/** Horizontal drag handle (also keyboard: arrow keys) */
function useSplit(initial = 42) {
  const [pct, setPct] = useState(initial)
  const ref = useRef(null)
  const onPointerDown = (e) => {
    e.preventDefault()
    const box = ref.current.getBoundingClientRect()
    const move = (ev) => setPct(Math.min(70, Math.max(25, ((ev.clientX - box.left) / box.width) * 100)))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setPct((p) => Math.max(25, p - 3))
    if (e.key === 'ArrowRight') setPct((p) => Math.min(70, p + 3))
  }
  return [pct, ref, { onPointerDown, onKeyDown }]
}

export default function StudentCodeEditor() {
  const { courseId, assignmentId } = useParams()
  const { theme } = useTheme()
  const [state, setState] = useState({ loading: true, problem: null, error: null })
  const [lang, setLang] = useState('python')
  const [codes, setCodes] = useLocalState(`sb:code:${assignmentId}`, {})
  const [tab, setTab] = useState('problem')
  const [run, setRun] = useState({ busy: null, result: null, kind: null })
  const [confirm, setConfirm] = useState(false)
  const [splitPct, splitRef, splitHandlers] = useSplit()

  const load = useCallback(() => {
    setState({ loading: true, problem: null, error: null })
    getCodingAssignment(assignmentId)
      .then((p) => {
        setState({ loading: false, problem: p, error: null })
        setLang(normLang(p.language) || 'python')
      })
      .catch((e) => setState({ loading: false, problem: null, error: getErrorMessage(e) }))
  }, [assignmentId])
  useEffect(() => { load() }, [load])

  const problem = state.problem
  const fixedLang = problem ? normLang(problem.language) : null
  const starter = problem && normLang(problem.language) === lang && problem.starter_code ? problem.starter_code : STARTERS[lang]
  const code = codes[lang] ?? starter ?? ''
  const codeRef = useRef(code)
  useEffect(() => { codeRef.current = code }, [code])
  const getCode = () => code
  const closed = problem?.assgn_type === 'GrPA' && problem?.deadline && isPast(new Date(problem.deadline))

  const execute = useCallback(async (kind) => {
    setRun({ busy: kind, result: null, kind })
    setTab('results')
    try {
      const res = await runCode(assignmentId, codeRef.current, { submit: kind === 'submit' })
      if (res.error) throw new Error(res.error)
      const pub = (res.public_testcases ?? []).map(norm)
      const priv = (res.private_testcases ?? []).map(norm)
      const all = [...pub, ...priv]
      const passed = all.filter((r) => r.passed).length
      if (kind === 'submit') setCodeStatus(assignmentId, { state: all.length && passed === all.length ? 'solved' : 'attempted', passed, total: all.length, mark: res.mark })
      setRun({ busy: null, kind, result: { pub, priv, mark: res.mark, passedPriv: res.passed_private_count, passedPub: res.passed_public_count } })
      if (kind === 'submit') {
        if (res.late) toast.error('Deadline passed', { description: 'Your attempt was evaluated but not recorded.' })
        else toast.success('Submitted', { description: `Score ${Math.round(res.mark ?? 0)}% - ${res.passed_private_count ?? ''} hidden tests passed` })
      }
    } catch (e) {
      const msg = getErrorMessage(e)
      toast.error(kind === 'submit' ? 'Submission failed' : 'Run failed', { description: msg })
      setRun({ busy: null, kind, result: { error: msg } })
    }
  }, [assignmentId])

  if (state.loading) {
    return <div className="space-y-4 p-6" role="status" aria-label="Loading problem"><Skeleton className="h-8 w-80 max-w-full" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>
  }
  if (state.error) {
    return <div className="mx-auto max-w-lg p-6"><EmptyState icon={AlertCircle} title="Could not load this problem" description={state.error} action={<Button variant="outline" onClick={load}><RefreshCw className="size-4" /> Retry</Button>} /></div>
  }

  const paneVis = (name) => (tab === name ? 'flex' : 'hidden')
  const result = run.result

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[32rem] flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-3 py-2.5 sm:px-5">
        <Button to={`/app/courses/${courseId}/code`} variant="ghost" size="icon" aria-label="Back to problems"><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">{titleOf(problem.question)}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="brand">Week {problem.week}</Badge>
            <Badge variant={problem.assgn_type === 'GrPA' ? 'warning' : 'success'}>{problem.assgn_type === 'GrPA' ? 'Graded' : 'Practice'}</Badge>
            {problem.deadline && <Badge variant={closed ? 'danger' : 'neutral'}><Clock className="size-3" /> {closed ? 'Closed' : `Due ${format(new Date(problem.deadline), 'MMM d, p')}`}</Badge>}
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Select aria-label="Language" className="h-9 min-w-0 flex-1 sm:w-36 sm:flex-none" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l} disabled={!!fixedLang && fixedLang !== l}>{LANG_LABEL[l]}{fixedLang && fixedLang !== l ? ' (n/a)' : ''}</option>)}
          </Select>
          <Button variant="outline" size="sm" onClick={() => execute('run')} loading={run.busy === 'run'} disabled={!!run.busy} title="Run public tests (Ctrl/Cmd+Enter)"><Play className="size-4" /> Run</Button>
          <Button size="sm" onClick={() => setConfirm(true)} loading={run.busy === 'submit'} disabled={!!run.busy || closed}><Send className="size-4" /> Submit</Button>
        </div>
      </header>

      <div role="tablist" aria-label="Panels" className="flex border-b border-border bg-surface lg:hidden">
        {[['problem', 'Problem', FileText], ['code', 'Code', Terminal], ['results', 'Results', CheckCircle2]].map(([v, l, Icon]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cn('flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-medium', tab === v ? 'border-brand-500 text-brand-600 dark:text-brand-300' : 'border-transparent text-muted')}>
            <Icon className="size-4" aria-hidden="true" /> {l}
          </button>
        ))}
      </div>

      <div ref={splitRef} className="flex min-h-0 flex-1 flex-col lg:flex-row" style={{ '--split': `${splitPct}%` }}>
        <section aria-label="Problem" className={cn('min-h-0 flex-1 flex-col overflow-y-auto bg-surface p-4 sm:p-5 lg:flex lg:w-[var(--split)] lg:flex-none', paneVis('problem'))}>
          <Problem problem={problem} assgnId={assignmentId} getCode={getCode} />
        </section>
        <div
          role="separator" aria-orientation="vertical" aria-label="Resize panels" aria-valuenow={Math.round(splitPct)} tabIndex={0}
          {...splitHandlers}
          className="hidden w-1.5 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-brand-400 focus-visible:bg-brand-500 lg:block"
        />
        <div className={cn('min-h-0 min-w-0 flex-1 flex-col lg:flex', tab === 'problem' ? 'hidden' : 'flex')}>
          <section aria-label="Editor" className={cn('min-h-0 flex-1 flex-col lg:flex', paneVis('code'))}>
            <div className="min-h-0 flex-1">
              <EditorBoundary fallbackProps={{ value: code, onChange: (v) => setCodes((c) => ({ ...c, [lang]: v })), readOnly: closed }}>
              <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
                <CodeMonaco value={code} onChange={(v) => setCodes((c) => ({ ...c, [lang]: v }))} language={monacoLang(lang)} dark={theme === 'dark'} readOnly={closed} onRun={() => execute('run')} />
              </Suspense>
              </EditorBoundary>
            </div>
          </section>
          <section aria-label="Results" aria-live="polite" className={cn('min-h-0 flex-col overflow-y-auto border-t border-border bg-surface p-4 lg:flex lg:h-[38%] lg:flex-none', paneVis('results'))}>
            {run.busy ? (
              <div className="space-y-2" role="status" aria-label="Running tests"><p className="text-sm text-muted">{run.busy === 'submit' ? 'Submitting and grading...' : 'Running tests...'}</p><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : !result ? (
              <p className="text-sm text-muted">Run your code to see test results here. <kbd className="rounded border border-border px-1 text-xs">Ctrl/Cmd</kbd>+<kbd className="rounded border border-border px-1 text-xs">Enter</kbd> runs the public tests.</p>
            ) : result.error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{result.error}</p>
            ) : (
              <>
                {run.kind === 'submit' && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
                    <span className="text-2xl font-semibold">{Math.round(result.mark ?? 0)}%</span>
                    <span className="text-sm text-muted">Hidden tests passed: <b className="text-fg">{result.passedPriv ?? '-'}</b></span>
                  </div>
                )}
                <ResultsTable title="Public tests" rows={result.pub} />
                {run.kind === 'submit' && <ResultsTable title="Hidden tests" rows={result.priv} />}
              </>
            )}
          </section>
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm} title="Submit for grading?" description="Your code is run against all hidden tests and your latest attempt is graded."
        footer={<><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => { setConfirm(false); execute('submit') }}>Submit</Button></>}>
        <p className="text-sm text-muted">{problem.assgn_type === 'GrPA' ? 'This is a graded problem. You can resubmit until the deadline.' : 'This is a practice problem, so it is safe to try again afterwards.'}</p>
      </Dialog>
    </div>
  )
}
