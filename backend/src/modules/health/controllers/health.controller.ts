import { Controller, Get } from '@nestjs/common';
import { ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { HealthResponseDto } from '../dto/health-response.dto.js';
import { HealthService } from '../services/health.service.js';

export const HEALTH_PATH = 'health';

@ApiTags('health')
@Public()
@Controller(HEALTH_PATH)
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiServiceUnavailableResponse({ description: 'Database is unavailable' })
  async check(): Promise<HealthResponseDto> {
    return HealthResponseDto.from(await this.health.check());
  }
}
