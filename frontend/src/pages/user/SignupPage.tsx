import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateUser } from '@/features/user/hooks/userQueries'
import { normalizeError } from '@/api/client'
import { Button } from '@/components/common/Button'
import { TextField } from '@/components/common/Field'
import { Alert } from '@/components/common/Alert'

export function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()
  const createUser = useCreateUser()

  const DUPLICATE_EMAIL = '이미 가입된 이메일입니다.'
  const error = createUser.error ? normalizeError(createUser.error, { 422: DUPLICATE_EMAIL }) : null
  // 422는 본문이 없어 필드 정보가 오지 않는다. 뜻이 정해져 있으니 이메일 칸 아래에 붙인다.
  const emailError = error?.status === 422 ? error.message : error?.fieldErrors.email

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    createUser.mutate(
      { name, email, password },
      // 가입만으로는 토큰이 생기지 않는다. 로그인 화면으로 넘기면서 이메일을 채워준다.
      { onSuccess: () => navigate('/login', { state: { email } }) },
    )
  }

  return (
    <div className="card auth-card">
      <h1>회원가입</h1>

      <form className="stack" onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
        {error && <Alert message={error.message} />}

        <TextField
          label="이름"
          value={name}
          autoComplete="name"
          required
          onChange={(event) => setName(event.target.value)}
          error={error?.fieldErrors.name}
        />
        <TextField
          label="이메일"
          type="email"
          value={email}
          autoComplete="email"
          required
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />
        <TextField
          label="비밀번호"
          type="password"
          value={password}
          autoComplete="new-password"
          required
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldErrors.password}
        />

        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      <p className="muted center" style={{ marginTop: '1rem' }}>
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </div>
  )
}
