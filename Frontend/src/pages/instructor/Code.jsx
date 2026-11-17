import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, isPast } from 'date-fns'
import { CheckCircle2, Code2, Pencil, Play, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useCourses } from '@/context/CoursesContext'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { createCodingAssignment, deleteCodingAssignment, getCodingAssignments, runCode, updateCodingAssignment } from '@/lib/services/coding'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { Tabs, TabsContent } from '@/components/ui/Tabs'
import { splitStatement } from '@/lib/markdown'
import { Markdown } from '@/components/ai/Markdown'
import { ConfirmDialog } from '@/components/instructor/Confirm'
import { CodeBox } from '@/components/instructor/CodeBox'
import { MarkdownEditor } from '@/components/instructor/MarkdownEditor'
import { WeekSelect } from '@/components/instructor/WeekFilter'
import { WEEKS, defaultDeadline, fromLocalInput, idOf, toLocalInput } from '@/components/instructor/utils'
import { cn } from '@/lib/cn'

const LANGS = [
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'js', label: 'JavaScript' },
]
const langLabel = (v) => LANGS.find((l) => l.value === v || (v === 'javascript' && l.value === 'js'))?.label ?? v
const TYPES = [
  { value: 'PPA', label: 'Practice' },
  { value: 'GrPA', label: 'Graded' },
]
const STARTERS = {
  python: 'def solve():\n    # read input with input()\n    pass\n\nsolve()\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}\n',
  js: "const lines = require('fs').readFileSync(0, 'utf8').split('\\n')\n",
}
let rowId = 0
const row = (t = {}) => ({ id: ++rowId, input: t.input ?? '', output: t.output ?? '' })

function TestRows({ title, hint, rows, onChange, error }) {
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  return (
    <fieldset>
      <legend className="text-sm font-medium text-fg">{title}</legend>
      <p className="mb-2 text-xs text-muted">{hint}</p>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_1fr_auto]">
            <Textarea aria-label={`${title} ${i + 1} input`} placeholder="Input (stdin)" rows={2} className="min-h-14 font-mono text-xs" value={r.input} onChange={(e) => set(r.id, { input: e.target.value })} />
            <Textarea aria-label={`${title} ${i + 1} expected output`} placeholder="Expected output" rows={2} className="order-3 col-span-2 min-h-14 font-mono text-xs sm:order-none sm:col-span-1" value={r.output} onChange={(e) => set(r.id, { output: e.target.value })} />
            <Button variant="ghost" size="icon" aria-label={`Remove ${title.toLowerCase()} ${i + 1}`} disabled={rows.length <= 1} onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...rows, row()])}><Plus className="size-4" /> Add test case</Button>
    </fieldset>
  )
}

function ResultList({ title, results, count }) {
  if (!results?.length) return null
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">{title} {count && <Badge variant="brand">{count}</Badge>}</h4>
      <ul className="space-y-1.5">
        {results.map((r, i) => (
          <li key={i} className={cn('rounded-lg border p-2.5 text-xs', r.passed ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10')}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {r.passed ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> : <XCircle className="size-4 text-red-600" aria-hidden="true" />}
              Test {i + 1}: {r.passed ? 'passed' : 'failed'}
              {r.time_ms != null && <span className="ml-auto font-normal text-muted">{Math.round(r.time_ms)} ms</span>}
            </div>
            {!r.passed && (r.input != null || r.error) && (
              <dl className="mt-1.5 grid gap-1 font-mono">
                {r.input != null && <div><dt className="inline text-muted">input: </dt><dd className="inline whitespace-pre-wrap break-all">{r.input}</dd></div>}
                {(r.expected ?? r.expected_output) != null && <div><dt className="inline text-muted">expected: </dt><dd className="inline whitespace-pre-wrap break-all">{r.expected ?? r.expected_output}</dd></div>}
                {r.output != null && <div><dt className="inline text-muted">got: </dt><dd className="inline whitespace-pre-wrap break-all">{r.output || '(empty)'}</dd></div>}
                {r.error && <div className="text-red-700 dark:text-red-300"><dt className="inline">error: </dt><dd className="inline whitespace-pre-wrap break-all">{r.error}</dd></div>}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CodeEditorDialog({ item, courseId, defaults, onClose, onSaved }) {
  const [statement, setStatement] = useState(item?.question ?? '')
  const [language, setLanguage] = useState(item?.language === 'javascript' ? 'js' : item?.language ?? 'python')
  const [type, setType] = useState(item?.assgn_type ?? 'PPA')
  const [week, setWeek] = useState(item?.week ?? defaults.week)
  const [deadline, setDeadline] = useState(item?.deadline ? toLocalInput(item.deadline) : defaultDeadline())
  const [evaluated, setEvaluated] = useState(item?.evaluated ?? false)
  const [starter, setStarter] = useState(item?.starter_code ?? STARTERS.python)
  const [reference, setReference] = useState('')
  const [pub, setPub] = useState(() => (item?.public_testcase?.length ? item.public_testcase.map(row) : [row()]))
  const [priv, setPriv] = useState(() => (item?.private_testcase?.length ? item.private_testcase.map(row) : [row()]))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const changeLang = (l) => {
    if (starter === STARTERS[language] || !starter.trim()) setStarter(STARTERS[l])
    setLanguage(l)
  }

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!statement.trim()) errs.statement = 'Problem statement is required.'
    const bad = (rows) => rows.some((r) => !r.input.trim() || !r.output.trim())
    if (bad(pub)) errs.pub = 'Every public test needs an input and an expected output.'
    if (bad(priv)) errs.priv = 'Every private test needs an input and an expected output.'
    if (!fromLocalInput(deadline)) errs.deadline = 'Pick a valid deadline.'
    setErrors(errs)
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields')
    setBusy(true)
    const body = {
      question: statement,
      language,
      public_testcase: pub.map(({ input, output }) => ({ input, output })),
      private_testcase: priv.map(({ input, output }) => ({ input, output })),
      assgn_type: type,
      course_id: courseId,
      week,
      evaluated,
      deadline: fromLocalInput(deadline),
      starter_code: starter,
    }
    try {
      if (item) await updateCodingAssignment(idOf(item), body)
      else await createCodingAssignment(body)
      toast.success(item ? 'Assignment updated' : 'Assignment created')
      onSaved()
    } catch (err) {
      toast.error('Could not save assignment', { description: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    if (!reference.trim()) return toast.error('Write a reference solution first')
    setRunning(true)
    setResult(null)
    try {
      const r = await runCode(idOf(item), reference, { submit: true })
      if (r?.error) toast.error('Runner reported an error', { description: String(r.error) })
      setResult(r)
    } catch (err) {
      toast.error('Could not run the solution', { description: getErrorMessage(err) })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={item ? 'Edit coding assignment' : 'New coding assignment'}
      className="max-w-5xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="code-form" loading={busy}>{item ? 'Save changes' : 'Create assignment'}</Button>
        </>
      }
    >
      <form id="code-form" onSubmit={save} noValidate className="space-y-5">
        <MarkdownEditor label="Problem statement" required value={statement} onChange={setStatement} error={errors.statement} rows={9} placeholder={'## Two Sum\nRead `n` and print...'} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Language" value={language} onChange={(e) => changeLang(e.target.value)}>
            {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </Select>
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <WeekSelect value={week} onChange={setWeek} />
          <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
          <input type="checkbox" role="switch" checked={evaluated} onChange={(e) => setEvaluated(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
          <span>
            <span className="block text-sm font-medium text-fg">Evaluated</span>
            <span className="block text-xs text-muted">Counts towards marks (graded against the private tests).</span>
          </span>
        </label>
        <div className="grid gap-5 lg:grid-cols-2">
          <TestRows title="Public tests" hint="Visible to students while they work." rows={pub} onChange={setPub} error={errors.pub} />
          <TestRows title="Private tests" hint="Hidden; used for grading." rows={priv} onChange={setPriv} error={errors.priv} />
        </div>
        <Tabs
          defaultValue="starter"
          items={[{ value: 'starter', label: 'Starter code' }, { value: 'ref', label: 'Test my reference solution' }]}
        >
          <TabsContent value="starter">
            <p className="mb-2 text-xs text-muted">Pre-filled in the student editor.</p>
            <CodeBox label="Starter code" value={starter} onChange={setStarter} language={language} />
          </TabsContent>
          <TabsContent value="ref" className="space-y-3">
            <p className="text-xs text-muted">Runs your solution in the sandbox against the <strong>saved</strong> public and private tests. Not stored.</p>
            <CodeBox label="Reference solution" value={reference} onChange={setReference} language={language} />
            {item ? (
              <Button variant="secondary" loading={running} onClick={test}><Play className="size-4" /> Run against saved tests</Button>
            ) : (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Save the assignment first, then reopen it to test a reference solution.</p>
            )}
            {result && !result.error && (
              <div className="space-y-3" aria-live="polite">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={result.mark === 100 ? 'success' : 'warning'}>Score {result.mark}/100</Badge>
                  <Badge>Public {result.passed_public_count}</Badge>
                  <Badge>Private {result.passed_private_count}</Badge>
                </div>
                <ResultList title="Public tests" results={result.public_testcases} />
                <ResultList title="Private tests" results={result.private_testcases} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </form>
    </Dialog>
  )
}

export default function InstructorCode() {
  const { courseId } = useParams()
  const { currentCourse } = useCourses()
  const [week, setWeek] = useState('')
  const [type, setType] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [editor, setEditor] = useState(null)
  const [del, setDel] = useState(null)
  const [view, setView] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setItems(null)
    const weeks = week === '' ? WEEKS : [week]
    const types = type ? [type] : TYPES.map((t) => t.value)
    const res = await Promise.allSettled(weeks.flatMap((w) => types.map((t) => getCodingAssignments(courseId, w, t))))
    const ok = res.filter((r) => r.status === 'fulfilled')
    if (!ok.length) {
      setError(res[0].reason)
      setItems([])
      return
    }
    setItems(ok.flatMap((r) => r.value ?? []))
  }, [courseId, week, type])
  useEffect(() => {
    load()
  }, [load])

  const sorted = useMemo(() => [...(items ?? [])].sort((a, b) => a.week - b.week), [items])

  return (
    <PageContainer>
      <PageHeader
        title="Code assignments"
        description={`Programming problems for ${currentCourse?.course_name ?? courseId}, graded by public and private test cases.`}
        actions={<Button onClick={() => setEditor({})}><Plus className="size-4" /> New problem</Button>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <Select aria-label="Filter by week" value={week} onChange={(e) => setWeek(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">All weeks</option>
          {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </Select>
        <Select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Graded and practice</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>

      {items === null ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : error ? (
        <EmptyState icon={RefreshCw} title="Could not load problems" description={getErrorMessage(error)} action={<Button variant="outline" onClick={load}>Try again</Button>} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Code2} title="No coding problems here yet" description="Create a problem with a statement, starter code and test cases."
          action={<Button onClick={() => setEditor({})}><Plus className="size-4" /> New problem</Button>} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>li]:min-w-0">
          {sorted.map((c) => {
            const due = c.deadline ? new Date(c.deadline) : null
            return (
              <li key={idOf(c)}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="brand">Week {c.week}</Badge>
                    <Badge variant={c.assgn_type === 'GrPA' ? 'warning' : 'neutral'}>{c.assgn_type === 'GrPA' ? 'Graded' : 'Practice'}</Badge>
                    <Badge>{langLabel(c.language)}</Badge>
                    {c.evaluated && <Badge variant="success">Evaluated</Badge>}
                  </div>
                  <button className="mt-3 flex-1 text-left hover:text-brand-600 dark:hover:text-brand-300" onClick={() => setView(c)}>
                    <span className="block break-words font-semibold leading-snug text-fg">{splitStatement(c.question).title || 'Untitled problem'}</span>
                    {splitStatement(c.question).summary && <span className="mt-1 line-clamp-3 block break-words text-sm text-muted">{splitStatement(c.question).summary.slice(0, 220)}</span>}
                  </button>
                  <p className="mt-3 text-xs text-muted">
                    {c.public_testcase?.length ?? 0} public, {c.private_testcase?.length ?? 0} private tests
                    {due && <> &middot; <span className={isPast(due) ? 'text-red-600 dark:text-red-400' : ''}>{isPast(due) ? 'Closed' : 'Due'} {format(due, 'd MMM yyyy, HH:mm')}</span></>}
                  </p>
                  <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
                    <Button size="sm" variant="ghost" onClick={() => setEditor({ item: c })}><Pencil className="size-4" /> Edit / test</Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400" aria-label="Delete problem" onClick={() => setDel(c)}><Trash2 className="size-4" /></Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {editor && <CodeEditorDialog item={editor.item} courseId={courseId} defaults={{ week: week || 1 }} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load() }} />}
      {view && (
        <Dialog open onOpenChange={(o) => !o && setView(null)} title={`Week ${view.week} problem`} className="max-w-3xl"
          footer={<Button variant="outline" onClick={() => { setEditor({ item: view }); setView(null) }}><Pencil className="size-4" /> Edit</Button>}>
          <Markdown>{view.question}</Markdown>
        </Dialog>
      )}
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title="Delete this problem?"
        description="Student submissions for it will no longer be accessible."
        onConfirm={async () => {
          try {
            await deleteCodingAssignment(idOf(del))
            toast.success('Problem deleted')
            load()
          } catch (e) {
            toast.error('Could not delete problem', { description: getErrorMessage(e) })
            throw e
          }
        }}
      />
    </PageContainer>
  )
}
