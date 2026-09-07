/**
 * API 기본 경로. axios와 목 핸들러가 같은 값을 봐야 해서 한 곳에 둔다.
 * 기본값 '/api'는 vite dev 프록시를 태운다.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 목 API 사용 여부.
 * 백엔드 없이 화면을 돌려보려면 .env에서 VITE_USE_MOCK=true로 둔다.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK === 'true'

/** 목 핸들러가 쓸 절대/상대 경로 조합기. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
