import * as RadixTooltip from '@radix-ui/react-tooltip'

export const TooltipProvider = ({ children }) => (
  <RadixTooltip.Provider delayDuration={250} skipDelayDuration={100}>
    {children}
  </RadixTooltip.Provider>
)

/** <Tooltip content="Copy"><Button/></Tooltip> */
export function Tooltip({ content, children, side = 'top' }) {
  if (!content) return children
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-[60] animate-fade-in rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-pop dark:bg-slate-100 dark:text-slate-900"
        >
          {content}
          <RadixTooltip.Arrow className="fill-slate-900 dark:fill-slate-100" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
