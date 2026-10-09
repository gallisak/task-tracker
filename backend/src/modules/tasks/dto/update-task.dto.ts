import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client.js';

export class UpdateTaskDto {
  @IsOptionalNotNull()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptionalNotNull()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptionalNotNull()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;
}
