import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createLowlight } from 'lowlight'
// Register only the languages we show (rehype-highlight would bundle the whole "common" set, ~200 kB more).
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import java from 'highlight.js/lib/languages/java'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import cpp from 'highlight.js/lib/languages/cpp'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

const LANGUAGES = { python, javascript, js: javascript, java, json, bash, sh: bash, sql, xml, html: xml, cpp, c: cpp }
const lowlight = createLowlight(LANGUAGES)

const hastText = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(hastText).join(''))

/** Minimal rehype plugin: highlight `pre > code` blocks with the languages registered above. */
function rehypeLowlight() {
  const walk = (node, parent) => {
    if (node.type === 'element' && node.tagName === 'code' && parent?.tagName === 'pre') {
      const cls = Array.isArray(node.properties?.className) ? node.properties.className : []
      const lang = String(cls.find((c) => String(c).startsWith('language-')) ?? '').slice(9)
      const text = hastText(node)
      try {
        const result = lang && lowlight.registered(lang) ? lowlight.highlight(lang, text) : lowlight.highlightAuto(text)
        node.properties = { ...node.properties, className: ['hljs', ...cls] }
        if (result.children.length) node.children = result.children
      } catch {
        /* leave the block unhighlighted */
      }
      return
    }
    node.children?.forEach((c) => walk(c, node))
  }
  return (tree) => walk(tree, null)
}
const REHYPE_PLUGINS = [rehypeLowlight]

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
 * <Markdown>{string}</Markdown> (pass `inline` for one-line labels) - GitHub-flavoured markdown with syntax highlighting,
 * styled with Tailwind typography. Safe by default (raw HTML is not rendered).
 */
const inlineComponents = { ...components, p: ({ children }) => <>{children}</> }

export const Markdown = memo(function Markdown({ children, className, inline = false }) {
  if (inline) {
    // Inline rendering for short labels (flashcard fronts/backs, card titles): backticks/emphasis work, no block wrapper.
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...inlineComponents, pre: ({ children: c }) => <>{c}</> }}>
        {children || ''}
      </ReactMarkdown>
    )
  }
  return (
    <div
      className={cn(
        'prose prose-slate max-w-none break-words dark:prose-invert prose-headings:tracking-tight prose-a:text-brand-600 dark:prose-a:text-brand-300',
        'prose-p:leading-relaxed prose-pre:m-0 prose-pre:p-0 prose-pre:bg-transparent',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={REHYPE_PLUGINS} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
})
