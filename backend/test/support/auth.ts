import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

export async function registerUser(
  app: NestExpressApplication,
  name: string,
): Promise<TestUser> {
  const email = `${name.toLowerCase()}@example.com`;
  const response = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, name, password: 'correct-horse-battery' })
    .expect(201);

  return {
    id: response.body.user.id,
    email,
    name,
    accessToken: response.body.accessToken,
  };
}

export function bearer(user: TestUser): [string, string] {
  return ['Authorization', `Bearer ${user.accessToken}`];
}
