/**
 * 토큰을 담아두는 유일한 창구.
 * axios 인터셉터가 React 밖에서 토큰을 읽어야 해서 훅이 아닌 모듈로 뒀다.
 */
const TOKEN_KEY = 'til.access_token'

/**
 * clearToken이 React 밖(axios 인터셉터)에서 불리면 AuthProvider는 그 사실을 모른다.
 * 토큰이 만료돼 401을 맞았을 때 화면이 로그인으로 넘어가도록 이벤트로 알린다.
 */
export const AUTH_CLEARED_EVENT = 'til:auth-cleared'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    // 사생활 보호 모드 등에서 접근 자체가 막힐 수 있다.
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* 저장 실패해도 이번 세션은 메모리상 상태로 계속 굴러간다 */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
}
