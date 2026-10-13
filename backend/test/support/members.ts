import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaService } from '../../src/database/prisma.service.js';
import type { TestUser } from './auth.js';

export async function addMember(
  app: NestExpressApplication,
  workspaceId: string,
  user: TestUser,
): Promise<void> {
  await app.get(PrismaService).workspaceMember.create({
    data: { workspaceId, userId: user.id },
  });
}
