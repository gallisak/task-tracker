import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { durationToMs } from '../../../common/utils/duration.js';
import { normalizeEmail } from '../../../common/utils/email.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import { Env } from '../../../config/env.js';
import {
  type Prisma,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import { UsersService } from '../../users/services/users.service.js';
import { InviteMemberDto } from '../dto/invite-member.dto.js';
import {
  type CreateInvitationData,
  type InvitationWithInviter,
  WorkspaceInvitationsRepository,
} from '../repositories/workspace-invitations.repository.js';
import {
  type MemberWithUser,
  WorkspaceMembersRepository,
} from '../repositories/workspace-members.repository.js';
import {
  createInvitationToken,
  hashInvitationToken,
} from '../utils/invitation-token.js';
import { InvitationNotifier } from './invitation-notifier.service.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

@Injectable()
export class WorkspaceMembersService {
  private readonly logger = new Logger(WorkspaceMembersService.name);
  private readonly invitationTtlMs: number;

  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly members: WorkspaceMembersRepository,
    private readonly invitations: WorkspaceInvitationsRepository,
    private readonly users: UsersService,
    private readonly notifier: InvitationNotifier,
    config: ConfigService<Env, true>,
  ) {
    this.invitationTtlMs = durationToMs(
      config.get('INVITATION_TTL', { infer: true }),
    );
  }

  async findAll(
    workspaceId: string,
    actorId: string,
  ): Promise<MemberWithUser[]> {
    await this.access.requireMember(workspaceId, actorId);
    return this.members.findAll(workspaceId);
  }

  async findInvitations(
    workspaceId: string,
    actorId: string,
  ): Promise<InvitationWithInviter[]> {
    await this.access.requireOwner(workspaceId, actorId);
    return this.invitations.findAll(workspaceId);
  }

  async invite(
    workspaceId: string,
    actorId: string,
    dto: InviteMemberDto,
  ): Promise<InvitationWithInviter> {
    await this.access.requireOwner(workspaceId, actorId);

    const email = normalizeEmail(dto.email);
    const user = await this.users.findByEmail(email);
    if (user && (await this.access.isMember(workspaceId, user.id))) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const { token, tokenHash } = createInvitationToken();
    const invitation = await this.createInvitation({
      workspaceId,
      email,
      invitedById: actorId,
      tokenHash,
      expiresAt: new Date(Date.now() + this.invitationTtlMs),
    });

    this.logger.log(
      `Invitation ${invitation.id} created for workspace ${workspaceId} (by ${actorId})`,
    );
    this.notifier.send(email, token);
    return invitation;
  }

  async acceptInvitation(
    actor: AuthenticatedUser,
    token: string,
  ): Promise<string> {
    const invitation = await this.invitations.findByTokenHash(
      hashInvitationToken(token),
    );
    const usable =
      invitation !== null &&
      invitation.expiresAt > new Date() &&
      invitation.email === normalizeEmail(actor.email);

    if (!usable || !(await this.invitations.accept(invitation, actor.id))) {
      throw new NotFoundException('Invitation not found or expired');
    }

    this.logger.log(
      `User ${actor.id} joined workspace ${invitation.workspaceId} by invitation`,
    );
    return invitation.workspaceId;
  }

  async updateRole(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
    role: WorkspaceRole,
  ): Promise<MemberWithUser> {
    await this.access.requireOwner(workspaceId, actorId);

    const member = await this.members.withWorkspaceLock(
      workspaceId,
      async (tx) => {
        const target = await this.requireTarget(workspaceId, targetUserId, tx);
        if (target.role === WorkspaceRole.OWNER && role !== target.role) {
          await this.assertAnotherOwnerExists(workspaceId, tx);
        }
        return this.members.updateRole(workspaceId, targetUserId, role, tx);
      },
    );

    this.logger.log(
      `Member ${targetUserId} of workspace ${workspaceId} is now ${role} (by ${actorId})`,
    );
    return member;
  }

  async remove(
    workspaceId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.access.requireOwner(workspaceId, actorId);

    await this.members.withWorkspaceLock(workspaceId, async (tx) => {
      const target = await this.requireTarget(workspaceId, targetUserId, tx);
      if (target.role === WorkspaceRole.OWNER) {
        await this.assertAnotherOwnerExists(workspaceId, tx);
      }
      await this.members.remove(workspaceId, targetUserId, tx);
    });

    this.logger.log(
      `Member ${targetUserId} removed from workspace ${workspaceId} (by ${actorId})`,
    );
  }

  private async createInvitation(
    data: CreateInvitationData,
  ): Promise<InvitationWithInviter> {
    try {
      return await this.invitations.create(data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('This email has already been invited');
      }
      throw error;
    }
  }

  private async requireTarget(
    workspaceId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    const target = await this.members.find(workspaceId, userId, tx);
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    return target;
  }

  private async assertAnotherOwnerExists(
    workspaceId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if ((await this.members.countOwners(workspaceId, tx)) <= 1) {
      throw new ConflictException('Workspace must have at least one owner');
    }
  }
}
