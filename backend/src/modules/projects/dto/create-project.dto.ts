import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';

export class CreateProjectDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
