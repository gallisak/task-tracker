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

  @Matches(DURATION_PATTERN)
  INVITATION_TTL: string = '7d';

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

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_THROTTLE_LIMIT: number = 30;
}

const DEFAULT_SECRET_PREFIX = 'change-me';

function secretErrors(env: Env): string[] {
  const errors: string[] = [];
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (env.NODE_ENV !== 'production') {
    return errors;
  }

  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (env[name].startsWith(DEFAULT_SECRET_PREFIX)) {
      errors.push(`${name} must not keep its default value in production`);
    }
  }
  return errors;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const invalid = validateSync(env).map((error) =>
    Object.values(error.constraints ?? {}).join(', '),
  );
  const errors = invalid.length > 0 ? invalid : secretErrors(env);

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n  - ${errors.join('\n  - ')}`,
    );
  }

  return env;
}
