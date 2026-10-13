import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  WorkspaceInvitation,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import {
  USER_SUMMARY,
  type UserSummary,
} from '../../users/repositories/user-summary.js';

export type InvitationWithInviter = WorkspaceInvitation & {
  invitedBy: UserSummary;
};

export interface CreateInvitationData {
  workspaceId: string;
  email: string;
  invitedById: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AcceptedInvitation {
  id: string;
  workspaceId: string;
  role: WorkspaceRole;
}

@Injectable()
export class WorkspaceInvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateInvitationData): Promise<InvitationWithInviter> {
    return this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvitation.deleteMany({
        where: {
          workspaceId: data.workspaceId,
          email: data.email,
          expiresAt: { lte: new Date() },
        },
      });
      return tx.workspaceInvitation.create({
        data,
        include: { invitedBy: USER_SUMMARY },
      });
    });
  }

  findAll(workspaceId: string): Promise<InvitationWithInviter[]> {
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      include: { invitedBy: USER_SUMMARY },
      orderBy: { createdAt: 'asc' },
    });
  }

  findByTokenHash(tokenHash: string): Promise<WorkspaceInvitation | null> {
    return this.prisma.workspaceInvitation.findUnique({ where: { tokenHash } });
  }

  accept(invitation: AcceptedInvitation, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.workspaceInvitation.deleteMany({
        where: { id: invitation.id },
      });
      if (count === 0) {
        return false;
      }

      await tx.workspaceMember.createMany({
        data: [
          {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
          },
        ],
        skipDuplicates: true,
      });
      return true;
    });
  }
}
