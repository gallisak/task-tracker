import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '@/components/page-states'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getErrorMessage } from '@/lib/api-client'
import type { Project } from '../types'
import { useProjects } from '../use-projects'
import { DeleteProjectDialog } from './delete-project-dialog'

interface ProjectCardProps {
  project: Project
  canDelete: boolean
}

function ProjectCard({ project, canDelete }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">
          <Link
            to={`/projects/${project.id}`}
            className="underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            {project.name}
          </Link>
        </CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
        {canDelete && (
          <CardAction>
            <DeleteProjectDialog project={project} />
          </CardAction>
        )}
      </CardHeader>
    </Card>
  )
}

interface ProjectListProps {
  workspaceId: string
  canDelete: boolean
}

export function ProjectList({ workspaceId, canDelete }: ProjectListProps) {
  const projects = useProjects(workspaceId)

  if (projects.isPending) {
    return <LoadingState label="Loading projects…" />
  }

  if (projects.isError) {
    return (
      <ErrorState
        title="Could not load projects"
        message={getErrorMessage(projects.error)}
        onAction={() => void projects.refetch()}
      />
    )
  }

  if (projects.data.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        message="Create a project to start tracking tasks on a board."
      />
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.data.map((project) => (
        <li key={project.id}>
          <ProjectCard project={project} canDelete={canDelete} />
        </li>
      ))}
    </ul>
  )
}
