import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Compass className="size-7" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold tracking-widest text-brand-600 dark:text-brand-300">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted">The page you are looking for does not exist or has moved.</p>
      <Button to="/">Back to home</Button>
    </div>
  )
}
