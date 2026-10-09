import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './config/app.setup.js';
import { Env } from './config/env.js';
import { setupSwagger, SWAGGER_PATH } from './config/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });

  configureApp(app);
  setupSwagger(app);

  await app.listen(port);
  new Logger('Bootstrap').log(
    `API listening on port ${port}, docs at /${SWAGGER_PATH}`,
  );
}
await bootstrap();
