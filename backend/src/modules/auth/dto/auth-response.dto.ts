import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type { AuthResult } from '../services/auth.service.js';

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;

  static from(result: AuthResult): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.accessToken = result.tokens.accessToken;
    dto.user = UserResponseDto.from(result.user);
    return dto;
  }
}
