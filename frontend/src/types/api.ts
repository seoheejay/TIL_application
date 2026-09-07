/** 백엔드가 공통으로 돌려주는 값들의 타입. */

/** FastAPI 기본 에러 응답. */
export interface HttpErrorBody {
  detail?: string
}

/**
 * main.py의 validation_exception_handler가 400으로 내려주는 형태.
 * RequestValidationError.errors()를 그대로 담아 배열로 온다.
 */
export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

/** 화면에서 다루기 쉽게 정규화한 에러. */
export interface NormalizedError {
  status: number | null
  message: string
  /** 필드명 -> 메시지. 폼에서 인풋 아래에 붙이는 용도. */
  fieldErrors: Record<string, string>
}
