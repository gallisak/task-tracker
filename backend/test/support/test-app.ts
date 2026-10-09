import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/config/app.setup.js';
import { PrismaService } from '../../src/database/prisma.service.js';

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  return app;
}

export async function resetDatabase(
  app: NestExpressApplication,
): Promise<void> {
  await app.get(PrismaService)
    .$executeRaw`TRUNCATE TABLE "users", "workspaces" CASCADE`;
}
