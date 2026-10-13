import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SILENT_PATHS = new Set(['/api/health']);

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = performance.now();

    response.on('finish', () => {
      const path = request.originalUrl.split('?')[0];
      if (SILENT_PATHS.has(path)) {
        return;
      }

      const durationMs = Math.round(performance.now() - startedAt);
      const line = `${request.method} ${path} ${response.statusCode} ${durationMs}ms`;
      if (response.statusCode >= 500) {
        this.logger.error(line);
      } else if (response.statusCode >= 400) {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    });

    next();
  }
}
