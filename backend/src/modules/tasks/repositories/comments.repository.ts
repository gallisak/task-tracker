import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { Comment, User } from '../../../generated/prisma/client.js';

export type CommentWithAuthor = Comment & { author: User };

const WITH_AUTHOR = { author: true } as const;

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    taskId: string,
    authorId: string,
    body: string,
  ): Promise<CommentWithAuthor> {
    return this.prisma.comment.create({
      data: { taskId, authorId, body },
      include: WITH_AUTHOR,
    });
  }

  findAllByTask(taskId: string): Promise<CommentWithAuthor[]> {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: WITH_AUTHOR,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findForUser(
    commentId: string,
    userId: string,
  ): Promise<CommentWithAuthor | null> {
    return this.prisma.comment.findFirst({
      where: {
        id: commentId,
        task: { project: { workspace: { members: { some: { userId } } } } },
      },
      include: WITH_AUTHOR,
    });
  }

  update(commentId: string, body: string): Promise<CommentWithAuthor> {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body },
      include: WITH_AUTHOR,
    });
  }

  async delete(commentId: string): Promise<void> {
    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
