import type { Meta, StoryObj } from '@storybook/react-vite'
import { PriorityBadge } from './priority-badge'

const meta = {
  title: 'Tasks/PriorityBadge',
  component: PriorityBadge,
} satisfies Meta<typeof PriorityBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Low: Story = { args: { priority: 'LOW' } }

export const Medium: Story = { args: { priority: 'MEDIUM' } }

export const High: Story = { args: { priority: 'HIGH' } }

export const Urgent: Story = { args: { priority: 'URGENT' } }
