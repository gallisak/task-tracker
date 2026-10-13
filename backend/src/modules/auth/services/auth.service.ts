import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { User } from '../../../generated/prisma/client.js';
import { UsersService } from '../../users/services/users.service.js';
import { WorkspaceMembersService } from '../../workspaces/services/workspace-members.service.js';
import { LoginDto } from '../dto/login.dto.js';
import { RegisterDto } from '../dto/register.dto.js';
import { PasswordService } from './password.service.js';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js';
import { TokenPair, TokenService } from './token.service.js';

const REFRESH_REUSE_GRACE_MS = 10_000;

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly workspaceMembers: WorkspaceMembersService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    this.logger.log(`User registered: ${user.id}`);
    await this.acceptInvitations(user);
    return { user, tokens: await this.tokens.issue(user) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    const passwordMatches = await this.passwords.verify(
      user?.passwordHash,
      dto.password,
    );

    if (!user || !passwordMatches) {
      this.logger.warn('Failed login attempt');
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.refreshTokens.deleteExpiredForUser(user.id);
    await this.acceptInvitations(user);

    this.logger.log(`User logged in: ${user.id}`);
    return { user, tokens: await this.tokens.issue(user) };
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const payload = await this.tokens.verifyRefresh(refreshToken);
    const stored = await this.refreshTokens.findById(payload.jti);
    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const rotated = await this.refreshTokens.revokeIfActive(stored.id);
    if (!rotated && !(await this.wasJustRotated(stored.id))) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}, session revoked`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { user, tokens: await this.tokens.issue(user, stored.familyId) };
  }

  private async acceptInvitations(user: User): Promise<void> {
    try {
      await this.workspaceMembers.acceptPendingInvitations(user);
    } catch (error) {
      this.logger.error(
        `Could not accept pending invitations for user ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async wasJustRotated(tokenId: string): Promise<boolean> {
    const token = await this.refreshTokens.findById(tokenId);
    if (!token?.revokedAt) {
      return false;
    }

    const revokedMsAgo = Date.now() - token.revokedAt.getTime();
    return (
      revokedMsAgo <= REFRESH_REUSE_GRACE_MS &&
      (await this.refreshTokens.hasActiveToken(token.familyId))
    );
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.tokens.verifyRefresh(refreshToken, {
        ignoreExpiration: true,
      });
      await this.refreshTokens.revokeFamily(payload.fam);
      this.logger.log(`User logged out: ${payload.sub}`);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
    }
  }
}
