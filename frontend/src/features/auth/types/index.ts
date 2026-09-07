export interface LoginRequest {
  email: string
  password: string
}

/** FastAPI OAuth2 표준 토큰 응답. */
export interface TokenResponse {
  access_token: string
  token_type: string
}

/** JWT payload에서 뽑아 쓰는 최소 정보. 백엔드 CurrentUser와 대응된다. */
export interface CurrentUser {
  id: string
  role?: string
}
