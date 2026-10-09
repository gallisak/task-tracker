import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';

export class RegisterDto {
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
