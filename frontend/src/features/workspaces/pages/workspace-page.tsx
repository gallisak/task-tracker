import { ChevronLeftIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/page-states'
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog'
import { ProjectList } from '@/features/projects/components/project-list'
import { getErrorMessage, getErrorStatus } from '@/lib/api-client'
import { MembersSection } from '../components/members-section'
import { RoleBadge } from '../components/role-badge'
import { useWorkspace } from '../use-workspaces'

function isMissing(error: unknown): boolean {
  const status = getErrorStatus(error)
  return status === 404 || status === 400
}

export function WorkspacePage() {
  const { workspaceId = '' } = useParams()
  const workspace = useWorkspace(workspaceId)

  if (workspace.isPending) {
    return <LoadingState label="Loading workspace…" />
  }

  if (workspace.isError) {
    return isMissing(workspace.error) ? (
      <ErrorState
        title="Workspace not found"
        message="It may have been removed, or you are not a member of it."
      />
    ) : (
      <ErrorState
        title="Could not load workspace"
        message={getErrorMessage(workspace.error)}
        onAction={() => void workspace.refetch()}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          All workspaces
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {workspace.data.name}
          </h1>
          <RoleBadge role={workspace.data.role} />
        </div>
      </div>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Projects</h2>
          <CreateProjectDialog workspaceId={workspaceId} />
        </div>
        <ProjectList
          workspaceId={workspaceId}
          canDelete={workspace.data.role === 'OWNER'}
        />
      </section>
      <MembersSection
        workspaceId={workspaceId}
        canManage={workspace.data.role === 'OWNER'}
      />
    </div>
  )
}
