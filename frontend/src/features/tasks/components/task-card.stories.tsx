import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Task } from '../types'
import { TaskCardView } from './task-card'

const author = { id: 'user-1', name: 'Olena Koval', email: 'olena@example.com' }
const teammate = {
  id: 'user-2',
  name: 'Taras Melnyk',
  email: 'taras@example.com',
}

const task: Task = {
  id: 'task-1',
  projectId: 'project-1',
  title: 'Prepare the landing page copy',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assignee: null,
  creator: author,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
}

const meta = {
  title: 'Tasks/TaskCard',
  component: TaskCardView,
  args: { task },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskCardView>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDueDate: Story = {
  args: { task: { ...task, dueDate: '2026-12-01T00:00:00.000Z' } },
}

export const Assigned: Story = {
  args: { task: { ...task, assignee: teammate, priority: 'HIGH' } },
}

export const UrgentWithEverything: Story = {
  args: {
    task: {
      ...task,
      priority: 'URGENT',
      dueDate: '2026-10-20T00:00:00.000Z',
      assignee: teammate,
    },
  },
}

export const LongTitle: Story = {
  args: {
    task: {
      ...task,
      title:
        'Investigate why the weekly report export times out for workspaces with more than ten thousand tasks and document the findings',
      assignee: author,
    },
  },
}

export const Dragging: Story = {
  args: { className: 'cursor-grabbing shadow-lg' },
}
