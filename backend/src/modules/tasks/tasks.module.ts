import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { TasksController } from './controllers/tasks.controller.js';
import { TaskStatusChangesRepository } from './repositories/task-status-changes.repository.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  imports: [ProjectsModule, WorkspacesModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TaskStatusChangesRepository],
})
export class TasksModule {}
