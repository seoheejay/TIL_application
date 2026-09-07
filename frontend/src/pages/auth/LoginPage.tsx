import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { normalizeError } from '@/api/client'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/Field'
import { Alert } from '@/components/common/Alert'

/**
 * 백엔드는 없는 이메일이면 422, 비밀번호가 틀리면 401을 준다.
 * 어느 쪽이 틀렸는지 알려주지 않는 편이 낫고, 둘 다 사용자 입장에서는 같은 상황이다.
 */
const LOGIN_FAILED = '이메일 또는 비밀번호가 올바르지 않습니다.'

interface LocationState {
  from?: { pathname: string }
  email?: string
}

export function LoginPage() {
  const location = useLocation()
  const state = location.state as LocationState | null

  // 회원가입 직후 넘어온 경우 이메일을 채워 둔다.
  const [email, setEmail] = useState(state?.email ?? '')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()
  const login = useLogin()

  const redirectTo = state?.from?.pathname ?? '/notes'
  const error = login.error ? normalizeError(login.error, { 401: LOGIN_FAILED, 422: LOGIN_FAILED }) : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate(redirectTo, { replace: true }) })
  }

  return (
    <div className="card auth-card">
      <h1>로그인</h1>
      <p className="muted">노트를 보려면 로그인이 필요합니다.</p>

      <form className="stack" onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
        {error && <Alert message={error.message} />}

        <TextField
          label="이메일"
          type="email"
          value={email}
          autoComplete="email"
          required
          onChange={(event) => setEmail(event.target.value)}
          error={error?.fieldErrors.username ?? error?.fieldErrors.email}
        />
        <TextField
          label="비밀번호"
          type="password"
          value={password}
          autoComplete="current-password"
          required
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldErrors.password}
        />

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <p className="muted center" style={{ marginTop: '1rem' }}>
        계정이 없나요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  )
}
