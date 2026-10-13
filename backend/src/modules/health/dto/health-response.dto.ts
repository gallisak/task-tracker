import type { HealthReport } from '../services/health.service.js';

export class HealthResponseDto {
  status: 'ok';
  uptimeSeconds: number;
  databaseLatencyMs: number;
  timestamp: Date;

  static from(report: HealthReport): HealthResponseDto {
    const dto = new HealthResponseDto();
    dto.status = 'ok';
    dto.uptimeSeconds = report.uptimeSeconds;
    dto.databaseLatencyMs = report.databaseLatencyMs;
    dto.timestamp = new Date();
    return dto;
  }
}
