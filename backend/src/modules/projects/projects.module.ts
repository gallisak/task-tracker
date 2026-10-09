import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { ProjectsController } from './controllers/projects.controller.js';
import { ProjectsRepository } from './repositories/projects.repository.js';
import { ProjectAccessService } from './services/project-access.service.js';
import { ProjectsService } from './services/projects.service.js';

@Module({
  imports: [WorkspacesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessService, ProjectsRepository],
  exports: [ProjectAccessService],
})
export class ProjectsModule {}
