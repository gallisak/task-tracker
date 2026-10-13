import { BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

export interface TaskCursor {
  createdAt: Date;
  id: string;
}

const SEPARATOR = '|';

export function encodeTaskCursor(position: TaskCursor): string {
  return Buffer.from(
    `${position.createdAt.toISOString()}${SEPARATOR}${position.id}`,
  ).toString('base64url');
}

export function decodeTaskCursor(cursor: string): TaskCursor {
  const [timestamp, id] = Buffer.from(cursor, 'base64url')
    .toString('utf8')
    .split(SEPARATOR);
  const createdAt = new Date(timestamp);

  if (Number.isNaN(createdAt.getTime()) || !isUUID(id)) {
    throw new BadRequestException('Invalid cursor');
  }
  return { createdAt, id };
}
