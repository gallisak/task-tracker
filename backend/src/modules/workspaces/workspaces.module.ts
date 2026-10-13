import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { InvitationsController } from './controllers/invitations.controller.js';
import { WorkspaceMembersController } from './controllers/workspace-members.controller.js';
import { WorkspacesController } from './controllers/workspaces.controller.js';
import { WorkspaceInvitationsRepository } from './repositories/workspace-invitations.repository.js';
import { WorkspaceMembersRepository } from './repositories/workspace-members.repository.js';
import { WorkspacesRepository } from './repositories/workspaces.repository.js';
import { InvitationNotifier } from './services/invitation-notifier.service.js';
import { WorkspaceAccessService } from './services/workspace-access.service.js';
import { WorkspaceMembersService } from './services/workspace-members.service.js';
import { WorkspacesService } from './services/workspaces.service.js';

@Module({
  imports: [UsersModule],
  controllers: [
    WorkspacesController,
    WorkspaceMembersController,
    InvitationsController,
  ],
  providers: [
    WorkspacesService,
    WorkspaceAccessService,
    WorkspaceMembersService,
    InvitationNotifier,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitationsRepository,
  ],
  exports: [WorkspaceAccessService],
})
export class WorkspacesModule {}
