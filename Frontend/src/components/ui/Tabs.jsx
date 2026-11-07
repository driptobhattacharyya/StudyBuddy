import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/lib/cn'

/**
 * <Tabs defaultValue="a" items={[{ value:'a', label:'A', icon?: Icon }]}>
 *   <TabsContent value="a">...</TabsContent>
 * </Tabs>
 */
export function Tabs({ items, className, listClassName, children, ...props }) {
  return (
    <RadixTabs.Root className={className} {...props}>
      <RadixTabs.List className={cn('flex gap-1 overflow-x-auto border-b border-border', listClassName)}>
        {items.map(({ value, label, icon: Icon }) => (
          <RadixTabs.Trigger
            key={value}
            value={value}
            className={cn(
              'relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted transition-colors',
              'hover:text-fg data-[state=active]:border-brand-500 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-300',
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export const TabsContent = ({ className, ...props }) => (
  <RadixTabs.Content className={cn('pt-4 focus-visible:outline-offset-4', className)} {...props} />
)
