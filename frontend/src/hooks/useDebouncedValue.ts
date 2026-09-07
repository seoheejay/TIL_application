import { useEffect, useState } from 'react'

/**
 * 값이 잠시 멈춘 뒤에야 바뀐 값을 돌려준다.
 * 검색창에 글자를 칠 때마다 요청이 나가면 "f", "fa", "fas"... 로
 * 쓸모없는 호출이 쌓이고 응답 순서도 뒤바뀔 수 있어서 한 박자 기다린다.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    // 다음 입력이 들어오면 이전 타이머를 버린다. 그래서 마지막 입력만 살아남는다.
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}
