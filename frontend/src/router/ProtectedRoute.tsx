import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/AuthContext'

/**
 * 인증이 필요한 구간을 감싼다.
 * 로그인 후 원래 가려던 곳으로 돌려보내려고 현재 위치를 state에 실어 보낸다.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
