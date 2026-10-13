import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from './page-states'

const meta = {
  title: 'Shared/PageStates',
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Loading: Story = {
  render: () => <LoadingState label="Loading projects…" />,
}

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="No projects yet"
      message="Create a project to start tracking tasks on a board."
    />
  ),
}

export const EmptyWithAction: Story = {
  render: () => (
    <EmptyState
      title="No workspaces yet"
      message="Create your first workspace to start adding projects and tasks."
      action={<Button size="sm">New workspace</Button>}
    />
  ),
}

export const ErrorWithRetry: Story = {
  render: () => (
    <ErrorState
      title="Could not load tasks"
      message="Cannot reach the server. Check your connection and try again."
      onAction={() => undefined}
    />
  ),
}

export const ErrorWithoutAction: Story = {
  render: () => (
    <ErrorState
      title="Project not found"
      message="It may have been deleted, or you do not have access to it."
    />
  ),
}
