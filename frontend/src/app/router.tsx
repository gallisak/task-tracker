import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { LoadingState } from '@/components/page-states'
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '@/features/auth/components/route-guards'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingState />
      </div>
    ),
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/login',
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/login-page'))
                .LoginPage,
            }),
          },
          {
            path: '/register',
            lazy: async () => ({
              Component: (await import('@/features/auth/pages/register-page'))
                .RegisterPage,
            }),
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                path: '/',
                lazy: async () => ({
                  Component: (
                    await import('@/features/workspaces/pages/workspaces-page')
                  ).WorkspacesPage,
                }),
              },
              {
                path: '/workspaces/:workspaceId',
                lazy: async () => ({
                  Component: (
                    await import('@/features/workspaces/pages/workspace-page')
                  ).WorkspacePage,
                }),
              },
              {
                path: '/projects/:projectId',
                lazy: async () => ({
                  Component: (
                    await import('@/features/projects/pages/project-page')
                  ).ProjectPage,
                }),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
