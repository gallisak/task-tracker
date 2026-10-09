import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { Env } from '../../../config/env.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

@Injectable()
export class RefreshCookieService {
  private readonly baseOptions: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.baseOptions = {
      httpOnly: true,
      secure: config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    };
  }

  read(request: Request): string | undefined {
    const value: unknown = request.cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  set(response: Response, token: string, expires: Date): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.baseOptions,
      expires,
    });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.baseOptions);
  }
}
