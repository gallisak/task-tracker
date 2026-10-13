import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator.js';
import { Trim } from '../../../common/decorators/trim.decorator.js';
import { CALENDAR_DATE_PREFIX } from '../../../common/utils/date.js';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client.js';

export class CreateTaskDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

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
  @IsISO8601({ strict: true })
  @Matches(CALENDAR_DATE_PREFIX, {
    message: 'dueDate must start with a calendar date (YYYY-MM-DD)',
  })
  dueDate?: string | null;
}
