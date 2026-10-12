import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/page-states'
import { useSession } from '../session-store'

interface RedirectState {
  from?: string
}

function FullPageLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <LoadingState label="Checking your session…" />
    </div>
  )
}

export function ProtectedRoute() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoading />
  }
  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from } as RedirectState} />
  }
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoading />
  }
  if (status === 'authenticated') {
    const { from } = (location.state as RedirectState | null) ?? {}
    return <Navigate to={from ?? '/'} replace />
  }
  return <Outlet />
}
