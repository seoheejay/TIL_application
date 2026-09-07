import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/AuthContext'

/** 이미 로그인한 사용자가 로그인/회원가입 화면에 머무르지 않게 한다. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/notes" replace /> : <Outlet />
}
