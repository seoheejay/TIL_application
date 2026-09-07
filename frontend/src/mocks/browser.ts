import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetMockDb } from './db'

export const worker = setupWorker(...handlers)

/**
 * 목 API를 켠다. VITE_USE_MOCK이 true일 때만 호출된다.
 * 등록되지 않은 요청은 그대로 통과시켜서(bypass) 정적 파일 로딩을 막지 않는다.
 */
export async function startMockApi(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })

  // 데이터를 초기화하고 싶을 때 콘솔에서 __resetMockDb() 를 부른다.
  Object.assign(window, { __resetMockDb: resetMockDb })

  // eslint-disable-next-line no-console
  console.info('[mock] API 목이 켜져 있습니다. demo@example.com / demo1234 로 로그인하세요.')
}
