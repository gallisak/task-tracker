import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthRepository } from '../repositories/health.repository.js';

export interface HealthReport {
  uptimeSeconds: number;
  databaseLatencyMs: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly health: HealthRepository) {}

  async check(): Promise<HealthReport> {
    const startedAt = performance.now();
    try {
      await this.health.pingDatabase();
    } catch (error) {
      this.logger.error(
        'Health check failed: database is unreachable',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return {
      uptimeSeconds: Math.round(process.uptime()),
      databaseLatencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
