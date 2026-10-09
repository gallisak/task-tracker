import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';
import { WorkspaceResponseDto } from '../dto/workspace-response.dto.js';
import { WorkspacesService } from '../services/workspaces.service.js';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return WorkspaceResponseDto.from(
      await this.workspaces.create(user.id, dto),
    );
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkspaceResponseDto[]> {
    const memberships = await this.workspaces.findAllForUser(user.id);
    return memberships.map((membership) =>
      WorkspaceResponseDto.from(membership),
    );
  }

  @Get(':workspaceId')
  @ApiNotFoundResponse({ description: 'Workspace not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    return WorkspaceResponseDto.from(
      await this.workspaces.getForUser(workspaceId, user.id),
    );
  }
}
