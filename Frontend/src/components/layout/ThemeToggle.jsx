import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Tooltip } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Tooltip content={`Switch to ${next} mode`}>
      <Button variant="ghost" size="icon" className={className} onClick={toggleTheme} aria-label={`Switch to ${next} mode`}>
        {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </Button>
    </Tooltip>
  )
}
