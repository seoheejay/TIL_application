import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, getMe, getUsers, updateUser } from '../api/userApi'
import type { CreateUserRequest, GetUsersParams, UpdateUserRequest } from '../types'

export const userKeys = {
  all: ['users'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersParams) => [...userKeys.lists(), params] as const,
}

export function useMe() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: getMe,
  })
}

export function useUsers(params: GetUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    placeholderData: (previous) => previous,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => updateUser(payload),
    onSuccess: (user) => {
      // 응답이 곧 최신 내 정보라 다시 받아올 필요가 없다.
      queryClient.setQueryData(userKeys.me(), user)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
