import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { REFRESH_COOKIE_NAME } from '../modules/auth/services/refresh-cookie.service.js';

export const SWAGGER_PATH = 'api/docs';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Task Tracker API')
    .setDescription('Workspaces, projects and tasks with realtime updates')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build();

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    { swaggerOptions: { persistAuthorization: true } },
  );
}
