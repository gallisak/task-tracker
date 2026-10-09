import type { User } from '../../../generated/prisma/client.js';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
