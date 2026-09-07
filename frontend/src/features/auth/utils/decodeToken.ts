import type { CurrentUser } from '../types'

interface JwtPayload {
  user_id?: string
  sub?: string
  role?: string
  exp?: number
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  // atob는 latin1을 주므로 한글 등이 섞였을 때를 대비해 UTF-8로 다시 읽는다.
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * JWT에서 사용자 정보를 읽는다.
 *
 * 서명은 검증하지 않는다. 여기서 얻은 값은 화면 표시와 라우팅 판단에만 쓰고,
 * 실제 권한 판단은 전부 백엔드가 한다. 만료된 토큰은 null로 취급해서
 * 굳이 401을 한 번 맞고 나서야 로그인 화면으로 가는 일을 줄인다.
 */
export function decodeUserFromToken(token: string): CurrentUser | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return null
    }

    const id = payload.user_id ?? payload.sub
    if (!id) return null

    return { id, role: payload.role }
  } catch {
    return null
  }
}
