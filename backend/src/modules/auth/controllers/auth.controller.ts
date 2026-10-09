import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AuthResult, AuthService } from '../services/auth.service.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';
import {
  REFRESH_COOKIE_NAME,
  RefreshCookieService,
} from '../services/refresh-cookie.service.js';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(response, await this.auth.register(dto));
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  @HttpCode(HttpStatus.OK)
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(response, await this.auth.login(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    try {
      const result = await this.auth.refresh(this.refreshCookie.read(request));
      return this.respond(response, result);
    } catch (error) {
      this.refreshCookie.clear(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(this.refreshCookie.read(request));
    this.refreshCookie.clear(response);
  }

  private respond(response: Response, result: AuthResult): AuthResponseDto {
    this.refreshCookie.set(
      response,
      result.tokens.refreshToken,
      result.tokens.refreshExpiresAt,
    );
    return AuthResponseDto.from(result);
  }
}
