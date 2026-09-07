import { api } from '@/api/client'
import type { CreateUserRequest, GetUsersParams, GetUsersResponse, UpdateUserRequest, User } from '../types'

/** POST /users — 회원가입. 인증 없이 호출된다. 중복 이메일이면 422. */
export async function createUser(payload: CreateUserRequest): Promise<User> {
  const { data } = await api.post<User>('/users', payload)
  return data
}

/** GET /users/me — 토큰 주인의 정보. 토큰에는 id와 role뿐이라 이름/이메일은 여기서 가져온다. */
export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me')
  return data
}

/** PUT /users — 경로에 id가 없다. 누구를 고칠지는 백엔드가 토큰에서 꺼낸다. */
export async function updateUser(payload: UpdateUserRequest): Promise<User> {
  const { data } = await api.put<User>('/users', payload)
  return data
}

/**
 * DELETE /users — 회원 탈퇴. 204라 본문이 없다.
 * 경로에 id가 없다. 누구를 지울지는 백엔드가 토큰에서 꺼낸다.
 * 백엔드에 FK ON DELETE CASCADE가 걸려 있어 내 노트도 함께 지워진다.
 */
export async function deleteUser(): Promise<void> {
  await api.delete('/users')
}

/** GET /users?page=&items_per_page= — ADMIN 전용. 일반 토큰이면 403. */
export async function getUsers(params: GetUsersParams): Promise<GetUsersResponse> {
  const { data } = await api.get<GetUsersResponse>('/users', { params })
  return data
}
