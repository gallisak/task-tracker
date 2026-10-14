import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { durationToMs } from '../../../common/utils/duration.js';
import { Env } from '../../../config/env.js';
import type { RefreshToken, User } from '../../../generated/prisma/client.js';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export type VerifiedAccessToken = AccessTokenPayload & { exp: number };

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  fam: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokensRepository,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.accessTtlSeconds =
      durationToMs(config.get('JWT_ACCESS_TTL', { infer: true })) / 1000;
    this.refreshTtlMs = durationToMs(
      config.get('JWT_REFRESH_TTL', { infer: true }),
    );
  }

  async issue(
    user: Pick<User, 'id' | 'email'>,
    familyId: string = randomUUID(),
  ): Promise<TokenPair> {
    const stored = await this.refreshTokens.create({
      userId: user.id,
      familyId,
      expiresAt: this.nextRefreshExpiry(),
    });
    return this.sign(user, stored);
  }

  async rotate(
    user: Pick<User, 'id' | 'email'>,
    current: RefreshToken,
  ): Promise<TokenPair | null> {
    const next = await this.refreshTokens.rotate(current.id, {
      userId: user.id,
      familyId: current.familyId,
      expiresAt: this.nextRefreshExpiry(),
    });
    return next ? this.sign(user, next) : null;
  }

  async verifyAccess(token: string): Promise<VerifiedAccessToken> {
    try {
      return await this.jwt.verifyAsync<VerifiedAccessToken>(token, {
        secret: this.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefresh(
    token: string,
    options: { ignoreExpiration?: boolean } = {},
  ): Promise<RefreshTokenPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
        ignoreExpiration: options.ignoreExpiration ?? false,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async sign(
    user: Pick<User, 'id' | 'email'>,
    stored: RefreshToken,
  ): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: stored.id,
      fam: stored.familyId,
    };
    const refreshTtlSeconds = Math.max(
      1,
      Math.ceil((stored.expiresAt.getTime() - Date.now()) / 1000),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessTtlSeconds,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: refreshTtlSeconds,
      }),
    ]);

    return { accessToken, refreshToken, refreshExpiresAt: stored.expiresAt };
  }

  private nextRefreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlMs);
  }
}
