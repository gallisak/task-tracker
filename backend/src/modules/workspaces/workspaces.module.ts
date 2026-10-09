import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { WorkspaceMembersController } from './controllers/workspace-members.controller.js';
import { WorkspacesController } from './controllers/workspaces.controller.js';
import { WorkspaceInvitationsRepository } from './repositories/workspace-invitations.repository.js';
import { WorkspaceMembersRepository } from './repositories/workspace-members.repository.js';
import { WorkspacesRepository } from './repositories/workspaces.repository.js';
import { WorkspaceAccessService } from './services/workspace-access.service.js';
import { WorkspaceMembersService } from './services/workspace-members.service.js';
import { WorkspacesService } from './services/workspaces.service.js';

@Module({
  imports: [UsersModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [
    WorkspacesService,
    WorkspaceAccessService,
    WorkspaceMembersService,
    WorkspacesRepository,
    WorkspaceMembersRepository,
    WorkspaceInvitationsRepository,
  ],
  exports: [WorkspaceAccessService, WorkspaceMembersService],
})
export class WorkspacesModule {}
