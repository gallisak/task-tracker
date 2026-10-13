import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../config/env.js';

export const INVITATION_ACCEPT_PATH = '/invitations/accept';

@Injectable()
export class InvitationNotifier {
  private readonly logger = new Logger(InvitationNotifier.name);
  private readonly webOrigin: string;

  constructor(config: ConfigService<Env, true>) {
    this.webOrigin = config.get('CORS_ORIGIN', { infer: true });
  }

  send(email: string, token: string): void {
    const link = new URL(INVITATION_ACCEPT_PATH, this.webOrigin);
    link.searchParams.set('token', token);
    this.logger.log(`Invitation link for ${email}: ${link.toString()}`);
  }
}
