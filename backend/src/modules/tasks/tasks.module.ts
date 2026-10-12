import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { CommentsController } from './controllers/comments.controller.js';
import { TasksController } from './controllers/tasks.controller.js';
import { TasksGateway } from './gateways/tasks.gateway.js';
import { CommentsRepository } from './repositories/comments.repository.js';
import { TaskStatusChangesRepository } from './repositories/task-status-changes.repository.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { CommentsService } from './services/comments.service.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  imports: [AuthModule, ProjectsModule, WorkspacesModule],
  controllers: [TasksController, CommentsController],
  providers: [
    TasksService,
    CommentsService,
    TasksGateway,
    TasksRepository,
    TaskStatusChangesRepository,
    CommentsRepository,
  ],
})
export class TasksModule {}
