import type { User } from '../../../generated/prisma/client.js';

export const USER_SUMMARY = {
  select: { id: true, name: true, email: true },
} as const;

export type UserSummary = Pick<User, 'id' | 'name' | 'email'>;
