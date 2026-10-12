import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/page-states'

export function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  if (!notFound) {
    console.error('Unhandled route error', error)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <ErrorState
        title={notFound ? 'Page not found' : 'Something went wrong'}
        message={
          notFound
            ? 'The page you are looking for does not exist.'
            : 'This page failed to render. You can go back to the start.'
        }
        actionLabel="Go to home page"
        onAction={() => navigate('/', { replace: true })}
      />
    </div>
  )
}
