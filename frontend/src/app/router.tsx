import { lazy, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '@/features/auth/components/route-guards'
import { NotFoundPage } from '@/pages/not-found-page'
import { RouteErrorPage } from '@/pages/route-error-page'

function lazyPage<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name,
) {
  return lazy(async () => ({ default: (await load())[name] }))
}

const LoginPage = lazyPage(
  () => import('@/features/auth/pages/login-page'),
  'LoginPage',
)
const RegisterPage = lazyPage(
  () => import('@/features/auth/pages/register-page'),
  'RegisterPage',
)
const WorkspacesPage = lazyPage(
  () => import('@/features/workspaces/pages/workspaces-page'),
  'WorkspacesPage',
)
const WorkspacePage = lazyPage(
  () => import('@/features/workspaces/pages/workspace-page'),
  'WorkspacePage',
)
const ProjectPage = lazyPage(
  () => import('@/features/projects/pages/project-page'),
  'ProjectPage',
)

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <WorkspacesPage /> },
              { path: '/workspaces/:workspaceId', element: <WorkspacePage /> },
              { path: '/projects/:projectId', element: <ProjectPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
