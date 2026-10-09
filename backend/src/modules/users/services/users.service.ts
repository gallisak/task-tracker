import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeEmail } from '../../../common/utils/email.js';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import type { User } from '../../../generated/prisma/client.js';
import {
  CreateUserData,
  UsersRepository,
} from '../repositories/users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(normalizeEmail(email));
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      return await this.users.create({
        ...data,
        email: normalizeEmail(data.email),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
