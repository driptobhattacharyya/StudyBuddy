import { Link } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

export function UserMenu() {
  const { user, logout } = useAuth()
  const home = user?.role === 'instructor' ? '/instructor' : '/app'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open user menu"
          className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <Avatar name={user?.name || user?.email} src={user?.picture} size="sm" />
          <ChevronDown className="hidden size-3.5 text-subtle sm:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-fg">{user?.name || 'Signed in'}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <Badge variant="brand" className="mt-2 capitalize">
            {user?.role}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem asChild icon={LayoutDashboard}>
          <Link to={home} className="flex items-center gap-2.5">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem icon={LogOut} danger onSelect={() => logout()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
