import type { Meta, StoryObj } from '@storybook/react-vite'
import { RoleBadge } from './role-badge'

const meta = {
  title: 'Workspaces/RoleBadge',
  component: RoleBadge,
} satisfies Meta<typeof RoleBadge>

export default meta

type Story = StoryObj<typeof meta>

export const Owner: Story = { args: { role: 'OWNER' } }

export const Member: Story = { args: { role: 'MEMBER' } }
