import { UserSummaryDto } from '../../users/dto/user-summary.dto.js';
import type { CommentWithAuthor } from '../repositories/comments.repository.js';

export class CommentResponseDto {
  id: string;
  taskId: string;
  body: string;
  author: UserSummaryDto;
  createdAt: Date;
  updatedAt: Date;

  static from(comment: CommentWithAuthor): CommentResponseDto {
    const dto = new CommentResponseDto();
    dto.id = comment.id;
    dto.taskId = comment.taskId;
    dto.body = comment.body;
    dto.author = UserSummaryDto.from(comment.author);
    dto.createdAt = comment.createdAt;
    dto.updatedAt = comment.updatedAt;
    return dto;
  }
}
