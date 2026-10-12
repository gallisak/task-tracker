import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { ListTasksQueryDto } from '../dto/list-tasks-query.dto.js';
import { TaskListResponseDto } from '../dto/task-list-response.dto.js';
import { TaskResponseDto } from '../dto/task-response.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import { TasksService } from '../services/tasks.service.js';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('projects/:projectId/tasks')
  @ApiNotFoundResponse({ description: 'Project not found' })
  @ApiBadRequestResponse({ description: 'Invalid data or assignee' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.from(
      await this.tasks.create(projectId, user.id, dto),
    );
  }

  @Get('projects/:projectId/tasks')
  @ApiNotFoundResponse({ description: 'Project not found' })
  async findPage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListTasksQueryDto,
  ): Promise<TaskListResponseDto> {
    return TaskListResponseDto.from(
      await this.tasks.findPage(projectId, user.id, query),
    );
  }

  @Get('tasks/:taskId')
  @ApiNotFoundResponse({ description: 'Task not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.from(await this.tasks.getForUser(taskId, user.id));
  }

  @Patch('tasks/:taskId')
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiBadRequestResponse({ description: 'Invalid data or assignee' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return TaskResponseDto.from(await this.tasks.update(taskId, user.id, dto));
  }

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse({ description: 'Task not found' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<void> {
    await this.tasks.remove(taskId, user.id);
  }
}
