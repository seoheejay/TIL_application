import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { Button } from '@/components/common/Button'

export function Header() {
  const { isAuthenticated, user, signOut } = useAuth()
  // GET /users는 ADMIN 토큰에만 열려 있다. 일반 로그인 토큰(USER)에게는 메뉴를 보여주지 않는다.
  const isAdmin = user?.role === 'ADMIN'
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'is-active' : '')

  // NavLink는 to="/notes"를 접두사로 매칭해서 /notes/tags 에서도 "노트"가 활성화된다.
  // 두 메뉴가 동시에 켜지지 않게 여기서 직접 가른다.
  const { pathname } = useLocation()
  const inTagSection = pathname.startsWith('/notes/tags')
  const inNoteSection = pathname.startsWith('/notes') && !inTagSection

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <span className="app-header__brand">TIL Notes</span>
        <nav className="app-header__nav">
          {isAuthenticated && (
            <>
              <NavLink to="/notes" className={inNoteSection ? 'is-active' : ''}>
                노트
              </NavLink>
              <NavLink to="/notes/tags" className={inTagSection ? 'is-active' : ''}>
                태그
              </NavLink>
              {isAdmin && (
                <NavLink to="/users" className={linkClass}>
                  유저
                </NavLink>
              )}
            </>
          )}
        </nav>
        {isAuthenticated ? (
          <>
            <NavLink to="/me" className={linkClass}>
              내 정보
            </NavLink>
            <Button variant="ghost" onClick={handleSignOut}>
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>
              로그인
            </NavLink>
            <NavLink to="/signup" className={linkClass}>
              회원가입
            </NavLink>
          </>
        )}
      </div>
    </header>
  )
}
