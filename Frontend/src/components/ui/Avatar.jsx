import { useState } from 'react'
import { cn } from '@/lib/cn'

const sizes = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-base' }

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** <Avatar name="Ada Lovelace" src={picture} size="sm|md|lg" /> falls back to initials. */
export function Avatar({ name, src, size = 'md', className }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-accent-500 font-semibold text-white',
        sizes[size],
        className,
      )}
    >
      {src && !failed ? (
        <img src={src} alt={name ? `${name}'s avatar` : 'avatar'} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  )
}
