import { ChevronLeftIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Board } from '@/features/tasks/components/board'
import { CreateTaskDialog } from '@/features/tasks/components/create-task-dialog'
import { getErrorMessage, isNotFoundError } from '@/lib/api-client'
import { isUuid } from '@/lib/uuid'
import { useProject } from '../use-projects'

export function ProjectPage() {
  const { projectId = '' } = useParams()
  const project = useProject(projectId)

  if (!isUuid(projectId) || isNotFoundError(project.error)) {
    return (
      <ErrorState
        title="Project not found"
        message="It may have been deleted, or you do not have access to it."
      />
    )
  }

  if (project.isPending) {
    return <LoadingState label="Loading project…" />
  }

  if (project.isError) {
    return (
      <ErrorState
        title="Could not load project"
        message={getErrorMessage(project.error)}
        onAction={() => void project.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          to={`/workspaces/${project.data.workspaceId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Back to workspace
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {project.data.name}
          </h1>
          <CreateTaskDialog
            projectId={projectId}
            workspaceId={project.data.workspaceId}
          />
        </div>
        {project.data.description && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {project.data.description}
          </p>
        )}
      </div>
      <Board projectId={projectId} workspaceId={project.data.workspaceId} />
    </div>
  )
}
