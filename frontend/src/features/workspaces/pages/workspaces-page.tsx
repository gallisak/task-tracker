import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { getErrorMessage } from '@/lib/api-client'
import { CreateWorkspaceDialog } from '../components/create-workspace-dialog'
import type { Workspace } from '../types'
import { useWorkspaces } from '../use-workspaces'

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{workspace.name}</CardTitle>
        <CardAction>
          <Badge variant={workspace.role === 'OWNER' ? 'default' : 'secondary'}>
            {workspace.role === 'OWNER' ? 'Owner' : 'Member'}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

function WorkspaceList() {
  const workspaces = useWorkspaces()

  if (workspaces.isPending) {
    return <LoadingState label="Loading workspaces…" />
  }

  if (workspaces.isError) {
    return (
      <ErrorState
        title="Could not load workspaces"
        message={getErrorMessage(workspaces.error)}
        onAction={() => void workspaces.refetch()}
      />
    )
  }

  if (workspaces.data.length === 0) {
    return (
      <EmptyState
        title="No workspaces yet"
        message="Create your first workspace to start adding projects and tasks."
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.data.map((workspace) => (
        <li key={workspace.id}>
          <WorkspaceCard workspace={workspace} />
        </li>
      ))}
    </ul>
  )
}

export function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <CreateWorkspaceDialog />
      </div>
      <WorkspaceList />
    </div>
  )
}
