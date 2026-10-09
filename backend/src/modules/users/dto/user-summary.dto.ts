import type { User } from '../../../generated/prisma/client.js';

export class UserSummaryDto {
  id: string;
  name: string;
  email: string;

  static from(user: Pick<User, 'id' | 'name' | 'email'>): UserSummaryDto {
    const dto = new UserSummaryDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    return dto;
  }
}
