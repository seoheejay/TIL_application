/**
 * 목 전용 JWT 생성기.
 *
 * 서명은 진짜가 아니다. decodeUserFromToken이 header.payload.signature 세 조각과
 * user_id / exp를 읽기 때문에, 그 형식만 맞춰주면 프런트 흐름을 그대로 검증할 수 있다.
 */

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const ONE_DAY_SECONDS = 60 * 60 * 24

export interface MockTokenUser {
  id: string
  role: string
}

/** common/auth.py의 create_access_token과 같은 payload(user_id, role, exp)를 만든다. */
export function createMockJwt(userId: string, role: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(
    JSON.stringify({
      user_id: userId,
      role,
      exp: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS,
    }),
  )
  return `${header}.${payload}.mock-signature`
}

/** Authorization 헤더에서 user_id와 role을 꺼낸다. 서명 검증은 하지 않는다. */
export function readUserFromAuthHeader(authorization: string | null): MockTokenUser | null {
  if (!authorization?.startsWith('Bearer ')) return null

  const parts = authorization.slice('Bearer '.length).split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as { user_id?: string; role?: string; exp?: number }

    if (payload.exp && payload.exp * 1000 <= Date.now()) return null
    if (!payload.user_id || !payload.role) return null
    return { id: payload.user_id, role: payload.role }
  } catch {
    return null
  }
}
