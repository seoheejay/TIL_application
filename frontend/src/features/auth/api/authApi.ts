import { api } from '@/api/client'
import type { LoginRequest, TokenResponse } from '../types'

/**
 * 백엔드 로그인 엔드포인트 (user_controller.py의 login).
 *   - 경로:   POST /users/login
 *   - 본문:   application/x-www-form-urlencoded, username & password (OAuth2PasswordRequestForm)
 *   - 응답:   { access_token, token_type: "bearer" }
 *   - 실패:   없는 이메일 422, 비밀번호 불일치 401
 * 토큰 payload에는 user_id, role("USER"), exp가 들어 있다 (common/auth.py).
 */
export async function login({ email, password }: LoginRequest): Promise<TokenResponse> {
  // OAuth2PasswordRequestForm은 이메일이어도 필드명이 username이다.
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)

  const { data } = await api.post<TokenResponse>('/users/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}
