import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from '@/api/queryClient'
import { AuthProvider } from '@/features/auth/hooks/AuthContext'
import { router } from '@/router'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* v7_startTransition은 라우터가 아니라 이 컴포넌트에서 켠다. */}
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
