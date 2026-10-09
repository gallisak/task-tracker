import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly decoyHash = argon2.hash(randomBytes(32).toString('hex'));

  hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verify(hash: string | undefined, password: string): Promise<boolean> {
    try {
      const matches = await argon2.verify(
        hash ?? (await this.decoyHash),
        password,
      );
      return hash !== undefined && matches;
    } catch {
      return false;
    }
  }
}
