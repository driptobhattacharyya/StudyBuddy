import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Copy, FileText, RotateCcw, Sparkles, Square, Trash2 } from 'lucide-react'
import { useAIStream } from '@/lib/stream'
import { cn } from '@/lib/cn'
import { Markdown } from './Markdown'
import { extractCitations } from './citations'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { UnderTheHood } from './UnderTheHood'
import { EmptyState } from '@/components/ui/EmptyState'

let msgId = 0
const newId = () => `m${++msgId}`

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <Tooltip content={copied ? 'Copied' : 'Copy'}>
      <button
        aria-label="Copy message"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            /* ignore */
          }
        }}
        className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </Tooltip>
  )
}

function Bubble({ message, live, onRetry, userName, userPicture }) {
  const isUser = message.role === 'user'
  const content = live ?? message.content
  const extracted = isUser || live != null ? { body: content, citations: [] } : extractCitations(content)
  const body = extracted.body
  const metaCitations = (message.meta?.citations ?? []).map((c) => (typeof c === 'string' ? c : `${c.week != null ? `Week ${c.week}: ` : ''}${c.title}`))
  const citations = metaCitations.length ? metaCitations : extracted.citations
  const streaming = message.status === 'streaming'

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2.5 text-sm text-white shadow-sm sm:max-w-[75%]">
          {message.content}
        </div>
        <Avatar name={userName} src={userPicture} size="sm" className="mt-0.5 hidden sm:inline-flex" />
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 max-w-full flex-1">
        <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 shadow-card">
          {body ? (
            <div className="relative text-sm">
              <Markdown className="prose-sm">{body}</Markdown>
              {streaming && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-blink rounded-sm bg-brand-500" />}
            </div>
          ) : streaming ? (
            <div className="flex items-center gap-1.5 py-1" role="status" aria-label="Assistant is thinking">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-subtle" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          ) : null}
          {message.status === 'stopped' && <p className="mt-2 text-xs text-subtle">Generation stopped.</p>}
          {message.status === 'error' && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {message.error || 'Something went wrong.'}
            </p>
          )}
          {citations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="text-xs font-medium text-muted">Sources</span>
              {citations.map((c) => (
                <span key={c} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                  <FileText className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{c}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {!streaming && (
          <div className="mt-1 flex items-center gap-0.5 pl-1">
            {body && <CopyButton text={body} />}
            <UnderTheHood traceId={message.meta?.trace_id} />
            {onRetry && (
              <Tooltip content="Regenerate">
                <button aria-label="Retry" onClick={onRetry} className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-fg">
                  <RotateCcw className="size-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * <ChatPanel path="/search_generate" buildPayload={(q) => ({ query: q, course_id, week: 0 })}
 *            suggestions={['Summarise week 1']} user={user} />
 *
 * - path: WebSocket path for useAIStream (see lib/services/ai.js: WS_COURSE_CHAT / WS_ASSISTANT)
 * - buildPayload(query, history) -> the JSON object sent to the socket
 * - Fills its parent's height: put it in a container with a definite height (e.g. `h-[calc(100dvh-8rem)]`).
 */
export function ChatPanel({
  path,
  buildPayload,
  suggestions = [],
  title = 'Ask anything',
  description = 'Answers stream in as they are generated.',
  placeholder = 'Ask a question...  (Enter to send, Shift+Enter for a new line)',
  user,
  className,
}) {
  const { text, send, stop, isStreaming } = useAIStream(path)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const stickRef = useRef(true)

  const patchLast = useCallback((patch) => {
    setMessages((prev) => {
      const next = prev.slice()
      next[next.length - 1] = { ...next[next.length - 1], ...patch }
      return next
    })
  }, [])

  const ask = useCallback(
    async (query, history) => {
      const q = query.trim()
      if (!q || isStreaming) return
      stickRef.current = true
      const assistant = { id: newId(), role: 'assistant', content: '', status: 'streaming' }
      setMessages([...history, { id: newId(), role: 'user', content: q }, assistant])
      const res = await send(buildPayload(q, history))
      patchLast({ content: res.text, status: res.status, error: res.error, meta: res.meta })
    },
    [buildPayload, isStreaming, patchLast, send],
  )

  const submit = () => {
    const q = input
    if (!q.trim()) return
    setInput('')
    ask(q, messages)
  }

  const retry = () => {
    const last = messages.length - 1
    const userMsg = messages[last - 1]
    if (userMsg?.role === 'user') ask(userMsg.content, messages.slice(0, last - 1))
  }

  // Auto-grow the composer.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // Keep scrolled to the bottom while streaming unless the user scrolled up.
  useEffect(() => {
    const el = listRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages, text])

  const onScroll = () => {
    const el = listRef.current
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const lastIndex = messages.length - 1

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-bg/60', className)}>
      <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-6">
            <EmptyState icon={Sparkles} title={title} description={description} className="w-full border-none bg-transparent" />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s, [])}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700 dark:hover:border-brand-600 dark:hover:text-brand-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <Bubble
              key={m.id}
              message={m}
              live={i === lastIndex && m.status === 'streaming' ? text : undefined}
              onRetry={i === lastIndex && m.role === 'assistant' && !isStreaming ? retry : undefined}
              userName={user?.name}
              userPicture={user?.picture}
            />
          ))
        )}
      </div>

      <div className="border-t border-border bg-surface p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-xl border border-border-strong bg-bg p-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          {messages.length > 0 && (
            <Tooltip content="Clear conversation">
              <button
                aria-label="Clear conversation"
                disabled={isStreaming}
                onClick={() => setMessages([])}
                className="mb-0.5 rounded-lg p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </Tooltip>
          )}
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            aria-label="Message"
            placeholder={placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            className="max-h-48 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-subtle"
          />
          {isStreaming ? (
            <button
              onClick={stop}
              aria-label="Stop generating"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim()}
              aria-label="Send message"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm transition-all hover:from-brand-500 hover:to-brand-700 disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 hidden text-center text-xs text-subtle sm:block">AI can make mistakes. Check important information.</p>
      </div>
    </div>
  )
}
