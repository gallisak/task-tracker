import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { normalizeEmail } from '../../../common/utils/email.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import {
  type Prisma,
  type User,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import { UsersService } from '../../users/services/users.service.js';
import { InviteMemberDto } from '../dto/invite-member.dto.js';
import {
  type InvitationWithInviter,
  WorkspaceInvitationsRepository,
} from '../repositories/workspace-invitations.repository.js';
import {
  type MemberWithUser,
  WorkspaceMembersRepository,
} from '../repositories/workspace-members.repository.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

export type InviteResult =
  | { status: 'ADDED'; member: MemberWithUser }
  | { status: 'INVITED'; invitation: InvitationWithInviter };

@Injectable()
export class WorkspaceMembersService {
  private readonly logger = new Logger(WorkspaceMembersService.name);

  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly members: WorkspaceMembersRepository,
    private readonly invitations: WorkspaceInvitationsRepository,
    private readonly users: UsersService,
  ) {}

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
  ): Promise<InviteResult> {
    await this.access.requireOwner(workspaceId, actorId);

    const email = normalizeEmail(dto.email);
    const user = await this.users.findByEmail(email);

    if (user) {
      return {
        status: 'ADDED',
        member: await this.addExistingUser(workspaceId, user, actorId),
      };
    }
    return {
      status: 'INVITED',
      invitation: await this.createInvitation(workspaceId, email, actorId),
    };
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

  async acceptPendingInvitations(user: User): Promise<void> {
    const accepted = await this.invitations.acceptAllForEmail(
      user.email,
      user.id,
    );
    if (accepted > 0) {
      this.logger.log(
        `User ${user.id} joined ${accepted} workspace(s) by invitation`,
      );
    }
  }

  private async addExistingUser(
    workspaceId: string,
    user: User,
    actorId: string,
  ): Promise<MemberWithUser> {
    try {
      const member = await this.members.add(
        workspaceId,
        user.id,
        WorkspaceRole.MEMBER,
      );
      this.logger.log(
        `User ${user.id} added to workspace ${workspaceId} (by ${actorId})`,
      );
      return member;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'User is already a member of this workspace',
        );
      }
      throw error;
    }
  }

  private async createInvitation(
    workspaceId: string,
    email: string,
    actorId: string,
  ): Promise<InvitationWithInviter> {
    try {
      const invitation = await this.invitations.create(
        workspaceId,
        email,
        actorId,
      );
      this.logger.log(
        `Invitation ${invitation.id} created for workspace ${workspaceId} (by ${actorId})`,
      );
      return invitation;
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
