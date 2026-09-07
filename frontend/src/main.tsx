import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { USE_MOCK_API } from './api/config'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root 엘리먼트를 찾지 못했습니다.')
}

const root = createRoot(container)

function render() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

/** 서비스 워커 등록이 끝나지 않아도 화면은 뜨게 하는 상한선. */
const MOCK_START_TIMEOUT_MS = 5000

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return Promise.race([
    promise,
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error(`목 API 기동이 ${ms}ms 안에 끝나지 않았습니다.`)), ms)
    }),
  ])
}

/**
 * 목을 켠 경우 워커가 준비된 뒤에 렌더한다.
 * 먼저 렌더하면 첫 요청이 워커를 지나치지 못하고 그냥 나가버린다.
 *
 * 다만 워커 등록에 렌더를 완전히 묶어두지는 않는다. 등록이 실패하거나
 * 늦어질 때 아무것도 없는 흰 화면이 남으면 원인을 짐작할 수가 없다.
 * 그런 경우엔 이유를 콘솔에 남기고 그냥 렌더한다. 이후 API 호출은
 * 실패하겠지만, normalizeError가 안내 문구를 띄워준다.
 */
async function bootstrap() {
  if (USE_MOCK_API) {
    try {
      const { startMockApi } = await import('./mocks/browser')
      await withTimeout(startMockApi(), MOCK_START_TIMEOUT_MS)
    } catch (error) {
      console.error('[mock] 목 API를 켜지 못했습니다. 실제 백엔드로 요청이 나갑니다.', error)
    }
  }

  render()
}

void bootstrap()
