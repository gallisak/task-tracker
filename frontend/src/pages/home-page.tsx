import { EmptyState } from '@/components/page-states'
import { useSession } from '@/features/auth/session-store'

export function HomePage() {
  const { user } = useSession()

  return (
    <EmptyState
      title={`Signed in as ${user?.name ?? ''}`}
      message="Workspaces and projects come next."
    />
  )
}
