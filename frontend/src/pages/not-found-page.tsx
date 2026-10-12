import { useNavigate } from 'react-router-dom'
import { ErrorState } from '@/components/page-states'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <ErrorState
        title="Page not found"
        message="The page you are looking for does not exist."
        actionLabel="Go to home page"
        onAction={() => navigate('/', { replace: true })}
      />
    </div>
  )
}
