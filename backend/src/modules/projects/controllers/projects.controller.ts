import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { ProjectResponseDto } from '../dto/project-response.dto.js';
import { ProjectsService } from '../services/projects.service.js';

@ApiTags('projects')
@ApiBearerAuth()
@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post('workspaces/:workspaceId/projects')
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  @ApiConflictResponse({ description: 'Project name is already taken' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return ProjectResponseDto.from(
      await this.projects.create(workspaceId, user.id, dto),
    );
  }

  @Get('workspaces/:workspaceId/projects')
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projects.findAll(workspaceId, user.id);
    return projects.map((project) => ProjectResponseDto.from(project));
  }

  @Get('projects/:projectId')
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectResponseDto> {
    return ProjectResponseDto.from(
      await this.projects.getForUser(projectId, user.id),
    );
  }

  @Delete('projects/:projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiForbiddenResponse({ description: 'Only owners can delete projects' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    await this.projects.remove(projectId, user.id);
  }
}
