import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { DURATION_PATTERN } from '../common/utils/duration.js';

export class Env {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @Matches(DURATION_PATTERN)
  JWT_ACCESS_TTL: string = '15m';

  @Matches(DURATION_PATTERN)
  JWT_REFRESH_TTL: string = '7d';

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = 'http://localhost:8080';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT: number = 10;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return env;
}
