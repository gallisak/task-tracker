import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { Env } from '../../config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';
import { RefreshCookieService } from './services/refresh-cookie.service.js';
import { TokenService } from './services/token.service.js';
import { CREDENTIALS_THROTTLER, REFRESH_THROTTLER } from './throttlers.js';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          name: CREDENTIALS_THROTTLER,
          ttl: ONE_MINUTE_MS,
          limit: config.get('AUTH_THROTTLE_LIMIT', { infer: true }),
        },
        {
          name: REFRESH_THROTTLER,
          ttl: ONE_MINUTE_MS,
          limit: config.get('REFRESH_THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    RefreshTokensRepository,
    RefreshCookieService,
  ],
  exports: [TokenService],
})
export class AuthModule {}
