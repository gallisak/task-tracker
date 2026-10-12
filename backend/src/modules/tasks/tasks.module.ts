import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { CommentsController } from './controllers/comments.controller.js';
import { TasksController } from './controllers/tasks.controller.js';
import { CommentsRepository } from './repositories/comments.repository.js';
import { TaskStatusChangesRepository } from './repositories/task-status-changes.repository.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { CommentsService } from './services/comments.service.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  imports: [ProjectsModule, WorkspacesModule],
  controllers: [TasksController, CommentsController],
  providers: [
    TasksService,
    CommentsService,
    TasksRepository,
    TaskStatusChangesRepository,
    CommentsRepository,
  ],
})
export class TasksModule {}
