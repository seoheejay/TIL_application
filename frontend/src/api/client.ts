import axios, { AxiosError } from 'axios'
import type { HttpErrorBody, NormalizedError, ValidationErrorItem } from '@/types/api'
import { getToken, clearToken } from '@/store/authStorage'
import { API_BASE_URL } from './config'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/** 요청마다 저장된 JWT를 붙인다. /notes 계열은 전부 인증이 필요하다. */
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** 401이면 토큰이 죽은 것으로 보고 지운다. 리다이렉트는 라우터가 맡는다. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken()
    }
    return Promise.reject(error)
  },
)

function isValidationErrorArray(data: unknown): data is ValidationErrorItem[] {
  return Array.isArray(data) && data.every((item) => item && typeof item === 'object' && 'loc' in item)
}

/**
 * axios 에러를 화면에서 바로 쓸 수 있는 모양으로 바꾼다.
 * 백엔드가 상황에 따라 세 가지 형태로 에러를 주기 때문에 여기서 흡수한다.
 *   - 400: RequestValidationError.errors() 배열
 *   - 422: 본문 없음. 뜻이 호출마다 다르다 (가입: 중복 이메일 / 로그인: 없는 계정 / 수정: 없는 유저)
 *   - 그 외: { detail: "..." }
 *
 * 422처럼 상태 코드만으로는 뜻이 정해지지 않는 경우 호출하는 쪽이
 * `overrides`로 상태 코드별 문구를 넘긴다. 검증 실패(400)는 필드별 사유가 있어 우선한다.
 */
export function normalizeError(
  error: unknown,
  overrides: Partial<Record<number, string>> = {},
): NormalizedError {
  if (!axios.isAxiosError(error)) {
    return { status: null, message: '알 수 없는 오류가 발생했습니다.', fieldErrors: {} }
  }

  const status = error.response?.status ?? null
  const data = error.response?.data

  // 응답 자체가 없으면 백엔드가 떠 있지 않은 경우가 대부분이다.
  // 그냥 "Network Error"만 띄우면 원인을 짐작하기 어려워서 안내를 덧붙인다.
  if (!error.response) {
    return {
      status: null,
      message: 'API 서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인하거나 VITE_USE_MOCK=true로 목 API를 쓰세요.',
      fieldErrors: {},
    }
  }

  if (isValidationErrorArray(data)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of data) {
      // loc는 ["body", "email"] 형태다. 마지막 요소가 실제 필드명이다.
      const field = item.loc[item.loc.length - 1]
      if (typeof field === 'string') {
        fieldErrors[field] = item.msg
      }
    }
    return { status, message: '입력값을 확인해 주세요.', fieldErrors }
  }

  const override = status !== null ? overrides[status] : undefined
  if (override) {
    return { status, message: override, fieldErrors: {} }
  }

  if (status === 422) {
    return { status, message: '요청을 처리할 수 없습니다. 입력값을 확인해 주세요.', fieldErrors: {} }
  }

  // 백엔드의 detail은 영어("Could not validate credentials" 등)라 그대로 보여주지 않는다.
  if (status === 401) {
    return { status, message: '로그인이 필요합니다. 다시 로그인해 주세요.', fieldErrors: {} }
  }

  if (status === 403) {
    return { status, message: '이 작업을 할 권한이 없습니다.', fieldErrors: {} }
  }

  const detail = (data as HttpErrorBody | undefined)?.detail

  return {
    status,
    message: detail ?? error.message ?? '요청을 처리하지 못했습니다.',
    fieldErrors: {},
  }
}
