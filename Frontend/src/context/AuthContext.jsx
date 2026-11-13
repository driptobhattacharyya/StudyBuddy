/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, setToken, setUnauthorizedHandler } from '@/lib/api'
import { toast } from '@/lib/toast'
import * as authService from '@/lib/services/auth'

const AuthContext = createContext(null)

// Keys written by the previous (CRA) version of the app - cleared on logout.
const LEGACY_KEYS = ['token', 'user_type', 'user_id', 'course_id']
export const LAST_COURSE_KEY = 'sb_last_course'

export const homeForRole = (role) => (role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/app')

/**
 * status: 'loading' (checking a stored token) | 'authenticated' | 'anonymous'
 * user:   { email, name, picture, role, courses } from GET /auth/me
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'anonymous'))
  const loadingRef = useRef(null)

  const clearSession = useCallback(() => {
    setToken(null)
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
      localStorage.removeItem(LAST_COURSE_KEY)
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
    setUser(null)
    setStatus('anonymous')
  }, [])

  const logout = useCallback(
    ({ redirect = true } = {}) => {
      clearSession()
      if (redirect) navigate('/', { replace: true })
    },
    [clearSession, navigate],
  )

  /** Fetch /auth/me for the stored token. Returns the user (or null on failure). */
  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setStatus('anonymous')
      return null
    }
    try {
      const me = await authService.getMe()
      setUser(me)
      setStatus('authenticated')
      return me
    } catch {
      clearSession()
      return null
    }
  }, [clearSession])

  /** Store a JWT and load the profile. Resolves with the user. Throws if the token is invalid. */
  const loginWithToken = useCallback(
    async (token) => {
      setToken(token)
      setStatus('loading')
      const me = await refreshUser()
      if (!me) throw new Error('Could not verify your session.')
      return me
    },
    [refreshUser],
  )

  /** Demo sign-in (only works when /auth/config reports demo_mode). role: 'student' | 'instructor' | 'admin' */
  const loginAsDemo = useCallback(
    async (role) => {
      const res = await authService.demoLogin(role)
      return loginWithToken(res.access_token)
    },
    [loginWithToken],
  )

  // Initial profile load for a stored token.
  useEffect(() => {
    if (loadingRef.current) return
    if (getToken()) {
      loadingRef.current = true
      refreshUser()
    }
  }, [refreshUser])

  // Any 401 from the API logs the user out and sends them to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      toast.warning('Session expired', { description: 'Please sign in again to continue.' })
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession, navigate])

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      loginWithToken,
      loginAsDemo,
      refreshUser,
      logout,
    }),
    [user, status, loginWithToken, loginAsDemo, refreshUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
