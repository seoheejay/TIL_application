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
            { path: 'notes/:id', element: <NoteDetailPage /> },
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
