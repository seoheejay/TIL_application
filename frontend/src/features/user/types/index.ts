/** user_controller.py의 UserResponse와 1:1 대응. password는 백엔드가 잘라낸다. */
export interface User {
  id: string
  name: string
  email: string
  /** 자유 메모. 한 번도 쓰지 않았으면 null. */
  memo: string | null
  created_at: string
  updated_at: string
}

/** CreateUserBody — name 2~32자, email 64자 이하, password 8~32자 */
export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

/**
 * UpdateUserBody — 전부 선택.
 * name/password는 보낸 값만 반영된다.
 * memo는 규칙이 다르다: 생략하면 그대로 두고, 빈 문자열을 보내면 지운다.
 */
export interface UpdateUserRequest {
  name?: string
  password?: string
  memo?: string
}

export interface GetUsersParams {
  page: number
  items_per_page: number
}

/** GET /users 응답. ADMIN 토큰이 아니면 403이다. */
export interface GetUsersResponse {
  total_count: number
  page: number
  users: User[]
}
