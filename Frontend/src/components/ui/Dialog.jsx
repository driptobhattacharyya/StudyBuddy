import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * <Dialog open onOpenChange title="..." description="..." footer={<Button/>}>content</Dialog>
 * Controlled (open/onOpenChange) or pass `trigger` for uncontrolled use.
 */
export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, className }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/50 backdrop-blur-sm" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-pop-in flex-col',
            'rounded-2xl border border-border bg-surface shadow-pop focus:outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 p-5 pb-2">
            <div className="min-w-0">
              <RadixDialog.Title className="text-lg font-semibold tracking-tight text-fg">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-3">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

export const DialogClose = RadixDialog.Close
