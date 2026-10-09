import { IsEmail, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator.js';

export class InviteMemberDto {
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email: string;
}
