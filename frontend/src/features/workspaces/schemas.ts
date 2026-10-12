import { z } from 'zod'

export const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
})

export type WorkspaceFormValues = z.infer<typeof workspaceSchema>

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .max(254, 'Email is too long'),
})

export type InviteFormValues = z.infer<typeof inviteSchema>
