import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/user/SignupPage'
import { UserListPage } from '@/pages/user/UserListPage'
import { ProfilePage } from '@/pages/user/ProfilePage'
import { NoteListPage } from '@/pages/note/NoteListPage'
import { NoteCreatePage } from '@/pages/note/NoteCreatePage'
import { NoteDetailPage } from '@/pages/note/NoteDetailPage'
import { NoteEditPage } from '@/pages/note/NoteEditPage'
import { NoteTagPage } from '@/pages/note/NoteTagPage'
import { TagIndexPage } from '@/pages/note/TagIndexPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/notes" replace /> },
        {
          element: <PublicOnlyRoute />,
          children: [
            { path: 'login', element: <LoginPage /> },
            { path: 'signup', element: <SignupPage /> },
          ],
        },
        {
          element: <ProtectedRoute />,
          children: [
            { path: 'notes', element: <NoteListPage /> },
            { path: 'notes/new', element: <NoteCreatePage /> },
            // 'notes/tags' 는 'notes/:id' 와 세그먼트 수가 같다.
            // React Router는 정적 세그먼트를 동적보다 우선하므로 순서와 무관하게 동작하지만,
            // 백엔드(FastAPI)는 선언 순서대로 매칭하므로 양쪽 규칙을 같은 순서로 맞춰 둔다.
            { path: 'notes/tags', element: <TagIndexPage /> },
            { path: 'notes/tags/:tagName', element: <NoteTagPage /> },
            { path: 'notes/:id', element: <NoteDetailPage /> },
            { path: 'notes/:id/edit', element: <NoteEditPage /> },
            { path: 'users', element: <UserListPage /> },
            { path: 'me', element: <ProfilePage /> },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    // v6에서 미리 켜두면 v7로 올릴 때 동작이 바뀌지 않는다.
    // v7_startTransition은 여기가 아니라 RouterProvider의 prop이다 (App.tsx).
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)
