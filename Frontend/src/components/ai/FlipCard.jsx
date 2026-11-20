import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false))
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

/**
 * Shared flashcard: shows `front`, flips (3D, or a crossfade with reduced motion) to reveal `back`.
 * Controlled via `flipped`/`onFlip`, or uncontrolled. `topLeft`/`topRight` are overlay controls rendered as
 * siblings of the flip surface, so clicking them never flips the card. `label` names the card for screen readers.
 */
export function FlipCard({ front, back, label, flipped, onFlip, defaultFlipped = false, className, topLeft, topRight, hint = true }) {
  const [inner, setInner] = useState(defaultFlipped)
  const controlled = flipped !== undefined
  const isFlipped = controlled ? flipped : inner
  const reduced = usePrefersReducedMotion()
  const toggle = () => {
    if (!controlled) setInner(!isFlipped)
    onFlip?.(!isFlipped)
  }
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation() // do not also trigger page-level shortcuts
      toggle()
    }
  }
  const face = (showing, back_) => ({
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: back_ && !reduced ? 'rotateY(180deg)' : undefined,
    opacity: reduced ? (showing ? 1 : 0) : 1,
    visibility: showing ? 'visible' : 'hidden',
    transition: reduced ? 'opacity 150ms linear' : `visibility 0s linear ${showing ? '0s' : '0.25s'}`,
  })
  const base = 'absolute inset-0 overflow-auto rounded-2xl border p-4 pt-10 text-center'
  return (
    <div className={cn('relative', className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${isFlipped ? 'Show question' : 'Show answer'}${label ? `: ${label}` : ''}`}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className="block h-full w-full cursor-pointer rounded-2xl text-left [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
      >
        <div
          className="relative h-full w-full transition-transform duration-500 motion-reduce:transition-none"
          style={{ transformStyle: reduced ? 'flat' : 'preserve-3d', transform: !reduced && isFlipped ? 'rotateY(180deg)' : 'none' }}
        >
          <div data-face="front" aria-hidden={isFlipped} style={face(!isFlipped, false)} className={cn(base, 'flex flex-col items-center border-border bg-surface shadow-card')}>
            <div className="my-auto w-full break-words font-semibold leading-snug tracking-tight">{front}</div>
            {hint && <p className="mt-2 shrink-0 text-[11px] text-subtle">Click to flip</p>}
          </div>
          <div data-face="back" aria-hidden={!isFlipped} style={face(isFlipped, true)} className={cn(base, 'border-brand-300 bg-brand-50 text-[15px] dark:border-brand-500/40 dark:bg-brand-500/10')}>
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full break-words">{back}</div>
            </div>
          </div>
        </div>
      </div>
      {topLeft && <div className="absolute left-2 top-2 z-10 flex items-center gap-1">{topLeft}</div>}
      {topRight && <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5">{topRight}</div>}
    </div>
  )
}
