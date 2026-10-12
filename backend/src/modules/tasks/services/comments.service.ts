import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommentDto } from '../dto/create-comment.dto.js';
import { UpdateCommentDto } from '../dto/update-comment.dto.js';
import {
  type CommentWithAuthor,
  CommentsRepository,
} from '../repositories/comments.repository.js';
import { TasksService } from './tasks.service.js';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly comments: CommentsRepository,
    private readonly tasks: TasksService,
  ) {}

  async create(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentWithAuthor> {
    const task = await this.tasks.getForUser(taskId, userId);

    const comment = await this.comments.create(task.id, userId, dto.body);
    this.logger.log(
      `Comment created: ${comment.id} on task ${task.id} by user ${userId}`,
    );
    return comment;
  }

  async findAll(taskId: string, userId: string): Promise<CommentWithAuthor[]> {
    const task = await this.tasks.getForUser(taskId, userId);
    return this.comments.findAllByTask(task.id);
  }

  async update(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentWithAuthor> {
    const comment = await this.requireOwnComment(commentId, userId);
    if (comment.body === dto.body) {
      return comment;
    }

    const updated = await this.comments.update(comment.id, dto.body);
    this.logger.log(`Comment updated: ${comment.id} by user ${userId}`);
    return updated;
  }

  async remove(commentId: string, userId: string): Promise<void> {
    const comment = await this.requireOwnComment(commentId, userId);

    await this.comments.delete(comment.id);
    this.logger.log(`Comment deleted: ${comment.id} by user ${userId}`);
  }

  private async requireOwnComment(
    commentId: string,
    userId: string,
  ): Promise<CommentWithAuthor> {
    const comment = await this.comments.findForUser(commentId, userId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can change this comment');
    }
    return comment;
  }
}
