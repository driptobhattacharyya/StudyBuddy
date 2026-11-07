import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from './Spinner'
import { buttonVariants } from './button-variants'

/**
 * <Button variant="primary|secondary|outline|ghost|danger|link" size="sm|md|lg|icon" loading>
 * Pass `to` to render a router <Link> styled as a button, or `href` for a plain anchor.
 */
export const Button = forwardRef(function Button(
  { variant, size, className, loading, disabled, children, to, href, type = 'button', ...props },
  ref,
) {
  const cls = buttonVariants({ variant, size, className })
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} {...props}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} {...props}>
        {children}
      </a>
    )
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  )
})
