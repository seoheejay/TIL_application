import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AUTH_CLEARED_EVENT, clearToken, getToken, setToken } from '@/store/authStorage'
import { decodeUserFromToken } from '../utils/decodeToken'
import type { CurrentUser } from '../types'

interface AuthContextValue {
  token: string | null
  user: CurrentUser | null
  isAuthenticated: boolean
  signIn: (token: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 새로고침해도 로그인이 유지되도록 초기값을 저장소에서 읽는다.
  const [token, setTokenState] = useState<string | null>(() => getToken())

  const signIn = useCallback((next: string) => {
    setToken(next)
    setTokenState(next)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setTokenState(null)
  }, [])

  // axios 인터셉터가 401을 받고 토큰을 지웠을 때(만료 등) 상태도 따라가게 한다.
  // 그래야 ProtectedRoute가 로그인 화면으로 보낸다.
  useEffect(() => {
    const handleCleared = () => setTokenState(null)
    window.addEventListener(AUTH_CLEARED_EVENT, handleCleared)
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleCleared)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = token ? decodeUserFromToken(token) : null
    return {
      token,
      user,
      // 토큰이 있어도 형식이 깨졌거나 만료됐으면 로그인으로 보지 않는다.
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }
  }, [token, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.')
  }
  return context
}
