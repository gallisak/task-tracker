import type { TaskPage } from '../services/tasks.service.js';
import { TaskResponseDto } from './task-response.dto.js';

export class TaskListResponseDto {
  items: TaskResponseDto[];
  total: number;
  limit: number;
  nextCursor: string | null;

  static from(result: TaskPage): TaskListResponseDto {
    const dto = new TaskListResponseDto();
    dto.items = result.items.map((task) => TaskResponseDto.from(task));
    dto.total = result.total;
    dto.limit = result.limit;
    dto.nextCursor = result.nextCursor;
    return dto;
  }
}
