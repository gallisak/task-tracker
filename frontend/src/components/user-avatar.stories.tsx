import type { Meta, StoryObj } from '@storybook/react-vite'
import { UserAvatar } from './user-avatar'

const meta = {
  title: 'Shared/UserAvatar',
  component: UserAvatar,
} satisfies Meta<typeof UserAvatar>

export default meta

type Story = StoryObj<typeof meta>

export const TwoNames: Story = { args: { name: 'Olena Koval' } }

export const SingleName: Story = { args: { name: 'Taras' } }

export const ManyNames: Story = { args: { name: 'Maria Ivanna Petrenko' } }

export const Small: Story = {
  args: { name: 'Olena Koval', className: 'size-6 text-xs' },
}
