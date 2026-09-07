import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '../api/authApi'
import { useAuth } from './AuthContext'
import type { LoginRequest } from '../types'

export function useLogin() {
  const { signIn } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (data) => {
      signIn(data.access_token)
      // 이전 사용자의 캐시가 남아 새 사용자 화면에 비치지 않도록 비운다.
      queryClient.clear()
    },
  })
}
