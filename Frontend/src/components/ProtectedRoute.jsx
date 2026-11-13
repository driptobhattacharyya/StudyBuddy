import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homeForRole, useAuth } from '@/context/AuthContext'
import { PageSkeleton } from '@/components/ui/Skeleton'

/**
 * Route guard. Use as a layout route:
 *   <Route element={<ProtectedRoute role="student" />}> ...child routes... </Route>
 * - not signed in  -> /login (remembers where you were going)
 * - wrong role     -> redirected to the dashboard of the role you do have
 * - `role` may be a string or an array, e.g. role={['instructor','admin']} (admins can do everything instructors can)
 * - `role` omitted -> any signed-in user
 */
export function ProtectedRoute({ role, children }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageSkeleton />
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  const allowed = role ? [].concat(role) : null
  if (allowed && !allowed.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />
  return children ?? <Outlet />
}
