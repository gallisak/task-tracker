import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

export interface InvitationToken {
  token: string;
  tokenHash: string;
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createInvitationToken(): InvitationToken {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashInvitationToken(token) };
}
