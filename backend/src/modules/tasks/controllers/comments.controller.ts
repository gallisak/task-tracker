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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator.js';
import { CommentResponseDto } from '../dto/comment-response.dto.js';
import { CreateCommentDto } from '../dto/create-comment.dto.js';
import { UpdateCommentDto } from '../dto/update-comment.dto.js';
import { CommentsService } from '../services/comments.service.js';

@ApiTags('comments')
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @ApiNotFoundResponse({ description: 'Task not found' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return CommentResponseDto.from(
      await this.comments.create(taskId, user.id, dto),
    );
  }

  @Get('tasks/:taskId/comments')
  @ApiNotFoundResponse({ description: 'Task not found' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<CommentResponseDto[]> {
    const comments = await this.comments.findAll(taskId, user.id);
    return comments.map((comment) => CommentResponseDto.from(comment));
  }

  @Patch('comments/:commentId')
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Only the author can edit' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return CommentResponseDto.from(
      await this.comments.update(commentId, user.id, dto),
    );
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Only the author can delete' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<void> {
    await this.comments.remove(commentId, user.id);
  }
}
