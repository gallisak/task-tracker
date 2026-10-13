import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { WorkspaceInvitation } from '../../../generated/prisma/client.js';
import {
  USER_SUMMARY,
  type UserSummary,
} from '../../users/repositories/user-summary.js';

export type InvitationWithInviter = WorkspaceInvitation & {
  invitedBy: UserSummary;
};

@Injectable()
export class WorkspaceInvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    workspaceId: string,
    email: string,
    invitedById: string,
  ): Promise<InvitationWithInviter> {
    return this.prisma.workspaceInvitation.create({
      data: { workspaceId, email, invitedById },
      include: { invitedBy: USER_SUMMARY },
    });
  }

  findAll(workspaceId: string): Promise<InvitationWithInviter[]> {
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      include: { invitedBy: USER_SUMMARY },
      orderBy: { createdAt: 'asc' },
    });
  }

  async acceptAllForEmail(email: string, userId: string): Promise<number> {
    const pending = await this.prisma.workspaceInvitation.count({
      where: { email },
    });
    if (pending === 0) {
      return 0;
    }

    return this.prisma.$transaction(async (tx) => {
      const invitations = await tx.workspaceInvitation.findMany({
        where: { email },
      });
      if (invitations.length === 0) {
        return 0;
      }

      await tx.workspaceMember.createMany({
        data: invitations.map((invitation) => ({
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        })),
        skipDuplicates: true,
      });
      await tx.workspaceInvitation.deleteMany({ where: { email } });

      return invitations.length;
    });
  }
}
