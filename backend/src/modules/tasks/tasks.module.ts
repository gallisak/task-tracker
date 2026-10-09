import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { TasksController } from './controllers/tasks.controller.js';
import { TasksRepository } from './repositories/tasks.repository.js';
import { TasksService } from './services/tasks.service.js';

@Module({
  imports: [ProjectsModule, WorkspacesModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
})
export class TasksModule {}
