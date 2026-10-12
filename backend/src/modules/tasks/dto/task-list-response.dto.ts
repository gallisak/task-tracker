import type { TaskPage } from '../services/tasks.service.js';
import { TaskResponseDto } from './task-response.dto.js';

export class TaskListResponseDto {
  items: TaskResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static from(result: TaskPage): TaskListResponseDto {
    const dto = new TaskListResponseDto();
    dto.items = result.items.map((task) => TaskResponseDto.from(task));
    dto.total = result.total;
    dto.page = result.page;
    dto.limit = result.limit;
    dto.totalPages = Math.ceil(result.total / result.limit);
    return dto;
  }
}
