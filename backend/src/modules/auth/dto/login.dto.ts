import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';

export class LoginDto {
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
