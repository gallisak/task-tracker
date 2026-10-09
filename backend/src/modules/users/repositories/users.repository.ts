import { Injectable } from '@nestjs/common';
import type { User } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma.service.js';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
