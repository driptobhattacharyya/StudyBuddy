import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

function nodeText(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  return nodeText(node.props?.children)
}

function CodeBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(nodeText(children).replace(/\n$/, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="group relative not-prose my-4">
      <pre {...props} className="overflow-x-auto rounded-xl border border-border bg-[#0d1117] p-4 text-[13px] leading-relaxed text-slate-200">
        {children}
      </pre>
      <button
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2 top-2 rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 opacity-0 transition hover:bg-white/10 focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

const components = {
  pre: CodeBlock,
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
}

/**
 * <Markdown>{string}</Markdown> - GitHub-flavoured markdown with syntax highlighting,
 * styled with Tailwind typography. Safe by default (raw HTML is not rendered).
 */
export const Markdown = memo(function Markdown({ children, className }) {
  return (
    <div
      className={cn(
        'prose prose-slate max-w-none break-words dark:prose-invert prose-headings:tracking-tight prose-a:text-brand-600 dark:prose-a:text-brand-300',
        'prose-p:leading-relaxed prose-pre:m-0 prose-pre:p-0 prose-pre:bg-transparent',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
})
