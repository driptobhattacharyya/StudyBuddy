/**
 * Admin users - ported. Endpoints: admin.getUsers (GET /admin/users), admin.setUserRole (PATCH /admin/users/{email}/role).
 * Assumed response: an array of { email, name, role, courses_count } (also accepts { users: [...] }).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Users as UsersIcon } from 'lucide-react'
import { getUsers, setUserRole } from '@/lib/services/admin'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

const ROLES = ['student', 'instructor', 'admin']
const ROLE_LABEL = { student: 'Student', instructor: 'Instructor', admin: 'Admin' }
const ROLE_VARIANT = { student: 'neutral', instructor: 'brand', admin: 'danger' }

// Defensive parsing: accept an array or { users: [...] }, and tolerate missing fields.
const listOf = (data) => (Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [])
const normalise = (u, i) => ({
  key: u?.email ?? `row-${i}`,
  email: String(u?.email ?? ''),
  name: u?.name || u?.email || 'Unnamed user',
  role: String(u?.role ?? 'student').toLowerCase(),
  courses: Number(u?.courses_count ?? u?.course_count ?? u?.courses ?? 0) || 0,
})

function RoleSelect({ user, disabled, onChange }) {
  return (
    <Select
      aria-label={`Role for ${user.name}`}
      value={user.role}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-36 text-sm"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
      {!ROLES.includes(user.role) && <option value={user.role}>{user.role}</option>}
    </Select>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading users">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState({})
  const [confirm, setConfirm] = useState(null) // { user, role }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(listOf(await getUsers()).map(normalise))
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Optimistic update; rolls back and toasts on failure.
  const applyRole = async (user, role) => {
    const previous = user.role
    const setRole = (r) => setUsers((list) => list.map((u) => (u.email === user.email ? { ...u, role: r } : u)))
    setRole(role)
    setSaving((s) => ({ ...s, [user.email]: true }))
    try {
      await setUserRole(user.email, role)
      toast.success(`${user.name} is now ${ROLE_LABEL[role] ?? role}`)
    } catch (e) {
      setRole(previous)
      toast.error('Could not change role', { description: getErrorMessage(e) })
    } finally {
      setSaving((s) => {
        const next = { ...s }
        delete next[user.email]
        return next
      })
    }
  }

  const requestRole = (user, role) => {
    if (role === user.role) return
    // Granting or removing admin needs explicit confirmation.
    if (role === 'admin' || user.role === 'admin') setConfirm({ user, role })
    else applyRole(user, role)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q))
  }, [users, query])

  const confirmAndApply = () => {
    const { user, role } = confirm
    setConfirm(null)
    applyRole(user, role)
  }

  return (
    <PageContainer>
      <PageHeader title="Users" description="Review accounts and change roles." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search users"
              placeholder="Search name, email or role"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {!loading && !error && (
            <p className="text-sm text-muted" aria-live="polite">
              {filtered.length} of {users.length} users
            </p>
          )}
        </div>

        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="p-5">
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users yet" description="Accounts will appear here once people sign up." className="m-5" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching users" description="Try a different name, email or role." className="m-5" />
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Users and their roles</caption>
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">User</th>
                    <th scope="col" className="px-5 py-3 font-medium">Role</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Courses</th>
                    <th scope="col" className="px-5 py-3 font-medium">Change role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => (
                    <tr key={u.key} className="hover:bg-surface-2/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-fg">{u.name}</p>
                            <p className="truncate text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={ROLE_VARIANT[u.role] ?? 'neutral'}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{u.courses}</td>
                      <td className="px-5 py-3">
                        <RoleSelect user={u} disabled={!!saving[u.email]} onChange={(r) => requestRole(u, r)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((u) => (
                <li key={u.key} className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-fg">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={ROLE_VARIANT[u.role] ?? 'neutral'}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      <span className="text-xs text-muted">{u.courses} {u.courses === 1 ? 'course' : 'courses'}</span>
                    </div>
                    <RoleSelect user={u} disabled={!!saving[u.email]} onChange={(r) => requestRole(u, r)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Dialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.role === 'admin' ? 'Make this user an admin?' : 'Remove admin access?'}
        description={
          confirm
            ? confirm.role === 'admin'
              ? `${confirm.user.name} (${confirm.user.email}) will get full access to admin pages and all AI usage data.`
              : `${confirm.user.name} (${confirm.user.email}) will lose access to admin pages.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant={confirm?.role === 'admin' ? 'primary' : 'danger'} onClick={confirmAndApply}>
              {confirm?.role === 'admin' ? 'Make admin' : 'Remove admin'}
            </Button>
          </>
        }
      />
    </PageContainer>
  )
}
