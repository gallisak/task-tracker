import { Module } from '@nestjs/common';
import { WorkspacesController } from './controllers/workspaces.controller.js';
import { WorkspacesRepository } from './repositories/workspaces.repository.js';
import { WorkspacesService } from './services/workspaces.service.js';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
