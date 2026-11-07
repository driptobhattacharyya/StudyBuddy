import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuSeparator = ({ className }) => <Menu.Separator className={cn('my-1 h-px bg-border', className)} />
export const DropdownMenuLabel = ({ className, ...props }) => (
  <Menu.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted', className)} {...props} />
)

export function DropdownMenuContent({ className, align = 'end', sideOffset = 8, ...props }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 max-w-[calc(100vw-1rem)] animate-pop-in rounded-xl border border-border bg-surface p-1.5 text-fg shadow-pop',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, icon: Icon, danger, children, ...props }) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors',
        'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        danger ? 'text-red-600 dark:text-red-400' : 'text-fg',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" />}
      {children}
    </Menu.Item>
  )
}
