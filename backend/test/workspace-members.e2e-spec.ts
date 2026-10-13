import { createHash, randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { InvitationNotifier } from '../src/modules/workspaces/services/invitation-notifier.service.js';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { addMember } from './support/members.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('Workspace members (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let workspaceId: string;

  const api = () => request(app.getHttpServer());

  const invite = (actor: TestUser, email: string) =>
    api()
      .post(`/api/workspaces/${workspaceId}/invitations`)
      .set(...bearer(actor))
      .send({ email });

  const inviteWithToken = async (email: string) => {
    const send = vi.spyOn(app.get(InvitationNotifier), 'send');
    const response = await invite(owner, email).expect(201);
    const token = send.mock.calls.at(-1)?.[1] ?? '';
    send.mockRestore();
    return { invitation: response.body, token };
  };

  const accept = (actor: TestUser, token: string) =>
    api()
      .post('/api/invitations/accept')
      .set(...bearer(actor))
      .send({ token });

  const getWorkspace = (actor: TestUser) =>
    api()
      .get(`/api/workspaces/${workspaceId}`)
      .set(...bearer(actor));

  const listInvitations = (actor: TestUser) =>
    api()
      .get(`/api/workspaces/${workspaceId}/invitations`)
      .set(...bearer(actor));

  const expireInvitations = () =>
    app.get(PrismaService).workspaceInvitation.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

  const listMembers = (actor: TestUser) =>
    api()
      .get(`/api/workspaces/${workspaceId}/members`)
      .set(...bearer(actor));

  const changeRole = (actor: TestUser, userId: string, role: string) =>
    api()
      .patch(`/api/workspaces/${workspaceId}/members/${userId}`)
      .set(...bearer(actor))
      .send({ role });

  const removeMember = (actor: TestUser, userId: string) =>
    api()
      .delete(`/api/workspaces/${workspaceId}/members/${userId}`)
      .set(...bearer(actor));

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app, 'Owner');
    member = await registerUser(app, 'Member');
    outsider = await registerUser(app, 'Outsider');

    const workspace = await api()
      .post('/api/workspaces')
      .set(...bearer(owner))
      .send({ name: 'Product team' })
      .expect(201);
    workspaceId = workspace.body.id;

    await addMember(app, workspaceId, member);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /members', () => {
    it('lists members with their roles to any member', async () => {
      const response = await listMembers(member).expect(200);

      expect(response.body).toEqual([
        {
          user: { id: owner.id, name: owner.name, email: owner.email },
          role: 'OWNER',
          joinedAt: expect.any(String),
        },
        {
          user: { id: member.id, name: member.name, email: member.email },
          role: 'MEMBER',
          joinedAt: expect.any(String),
        },
      ]);
    });

    it('hides the workspace from non-members', async () => {
      await listMembers(outsider).expect(404);
    });
  });

  describe('POST /invitations', () => {
    it('stores an invitation with an expiry and keeps the token out of the response', async () => {
      const before = Date.now();
      const { invitation, token } = await inviteWithToken(
        'newcomer@example.com',
      );

      expect(invitation).toEqual({
        id: expect.any(String),
        email: 'newcomer@example.com',
        role: 'MEMBER',
        invitedBy: { id: owner.id, name: owner.name, email: owner.email },
        createdAt: expect.any(String),
        expiresAt: expect.any(String),
      });
      const lifetime = new Date(invitation.expiresAt).getTime() - before;
      expect(lifetime).toBeGreaterThan(SEVEN_DAYS_MS - 60_000);
      expect(lifetime).toBeLessThan(SEVEN_DAYS_MS + 60_000);
      expect(token).not.toBe('');
      expect(JSON.stringify(invitation)).not.toContain(token);

      const pending = await listInvitations(owner).expect(200);
      expect(pending.body).toHaveLength(1);
    });

    it('stores only a hash of the token', async () => {
      const { invitation, token } = await inviteWithToken(
        'newcomer@example.com',
      );

      const stored = await app
        .get(PrismaService)
        .workspaceInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
        });
      expect(stored.tokenHash).toBe(
        createHash('sha256').update(token).digest('hex'),
      );
    });

    it('answers the same way whether or not the email has an account', async () => {
      const registered = await invite(owner, outsider.email).expect(201);
      const unknown = await invite(owner, 'newcomer@example.com').expect(201);

      expect(Object.keys(registered.body).sort()).toEqual(
        Object.keys(unknown.body).sort(),
      );
      expect(registered.body).not.toHaveProperty('status');
      expect(registered.body).not.toHaveProperty('member');
    });

    it('gives no access to whoever registers with an invited email', async () => {
      await invite(owner, 'newcomer@example.com').expect(201);

      const intruder = await registerUser(app, 'Newcomer');

      const workspaces = await api()
        .get('/api/workspaces')
        .set(...bearer(intruder))
        .expect(200);
      expect(workspaces.body).toEqual([]);
      await getWorkspace(intruder).expect(404);
    });

    it('does not add a registered user until they accept', async () => {
      await invite(owner, outsider.email.toUpperCase()).expect(201);

      await api()
        .post('/api/auth/login')
        .send({ email: outsider.email, password: 'correct-horse-battery' })
        .expect(200);

      await getWorkspace(outsider).expect(404);
      const members = await listMembers(owner).expect(200);
      expect(members.body).toHaveLength(2);
    });

    it('rejects a user who is already a member', async () => {
      const response = await invite(owner, member.email).expect(409);

      expect(response.body.message).toBe(
        'User is already a member of this workspace',
      );
    });

    it('rejects an email that has already been invited', async () => {
      await invite(owner, 'newcomer@example.com').expect(201);

      const response = await invite(owner, 'Newcomer@Example.com').expect(409);

      expect(response.body.message).toBe('This email has already been invited');
    });

    it('replaces an expired invitation with a new one', async () => {
      const first = await inviteWithToken('newcomer@example.com');
      await expireInvitations();

      const second = await inviteWithToken('newcomer@example.com');

      expect(second.invitation.id).not.toBe(first.invitation.id);
      const pending = await listInvitations(owner).expect(200);
      expect(pending.body).toHaveLength(1);
      const newcomer = await registerUser(app, 'Newcomer');
      await accept(newcomer, first.token).expect(404);
      await accept(newcomer, second.token).expect(200);
    });

    it('rejects an invalid email', async () => {
      await invite(owner, 'not-an-email').expect(400);
    });

    it('forbids members from inviting', async () => {
      await invite(member, outsider.email).expect(403);
    });

    it('hides the workspace from non-members', async () => {
      await invite(outsider, 'newcomer@example.com').expect(404);
    });

    it('shows pending invitations to owners only', async () => {
      await listInvitations(member).expect(403);
    });
  });

  describe('POST /api/invitations/accept', () => {
    it('adds a registered user who presents the token', async () => {
      const { token } = await inviteWithToken(outsider.email);

      const response = await accept(outsider, token).expect(200);

      expect(response.body).toEqual({ workspaceId });
      await getWorkspace(outsider).expect(200);
      const members = await listMembers(owner).expect(200);
      expect(members.body).toHaveLength(3);
      const pending = await listInvitations(owner).expect(200);
      expect(pending.body).toEqual([]);
    });

    it('adds a newcomer who registers and then accepts', async () => {
      const { token } = await inviteWithToken('newcomer@example.com');
      const newcomer = await registerUser(app, 'Newcomer');

      await accept(newcomer, token).expect(200);

      const workspaces = await api()
        .get('/api/workspaces')
        .set(...bearer(newcomer))
        .expect(200);
      expect(workspaces.body).toMatchObject([
        { id: workspaceId, role: 'MEMBER' },
      ]);
    });

    it('refuses a token presented by another account', async () => {
      const { token } = await inviteWithToken('newcomer@example.com');

      const response = await accept(outsider, token).expect(404);

      expect(response.body.message).toBe('Invitation not found or expired');
      await getWorkspace(outsider).expect(404);
      const pending = await listInvitations(owner).expect(200);
      expect(pending.body).toHaveLength(1);
    });

    it('refuses an expired invitation', async () => {
      const { token } = await inviteWithToken(outsider.email);
      await expireInvitations();

      await accept(outsider, token).expect(404);

      await getWorkspace(outsider).expect(404);
    });

    it('refuses a token that was already used', async () => {
      const { token } = await inviteWithToken(outsider.email);
      await accept(outsider, token).expect(200);

      await accept(outsider, token).expect(404);
    });

    it('refuses an unknown token', async () => {
      await accept(outsider, 'not-a-real-token').expect(404);
    });

    it('rejects a request without a token', async () => {
      await api()
        .post('/api/invitations/accept')
        .set(...bearer(outsider))
        .send({})
        .expect(400);
    });

    it('requires authentication', async () => {
      const { token } = await inviteWithToken(outsider.email);

      await api().post('/api/invitations/accept').send({ token }).expect(401);
    });
  });

  describe('PATCH /members/:userId', () => {
    it('lets an owner promote a member', async () => {
      const response = await changeRole(owner, member.id, 'OWNER').expect(200);

      expect(response.body).toMatchObject({
        user: { id: member.id },
        role: 'OWNER',
      });
    });

    it('lets an owner step down once another owner exists', async () => {
      await changeRole(owner, member.id, 'OWNER').expect(200);

      await changeRole(owner, owner.id, 'MEMBER').expect(200);
    });

    it('refuses to demote the last owner', async () => {
      const response = await changeRole(owner, owner.id, 'MEMBER').expect(409);

      expect(response.body.message).toBe(
        'Workspace must have at least one owner',
      );
    });

    it('forbids members from changing roles', async () => {
      await changeRole(member, member.id, 'OWNER').expect(403);
    });

    it('returns 404 for a user who is not a member', async () => {
      const response = await changeRole(owner, outsider.id, 'OWNER').expect(
        404,
      );

      expect(response.body.message).toBe('Member not found');
    });

    it('rejects an unknown role', async () => {
      await changeRole(owner, member.id, 'ADMIN').expect(400);
    });
  });

  describe('DELETE /members/:userId', () => {
    it('removes a member, who then loses access', async () => {
      await removeMember(owner, member.id).expect(204);

      await listMembers(member).expect(404);
      const remaining = await listMembers(owner).expect(200);
      expect(remaining.body).toHaveLength(1);
    });

    it('unassigns the removed member from tasks of this workspace', async () => {
      const prisma = app.get(PrismaService);
      const project = await prisma.project.create({
        data: { workspaceId, name: 'Website' },
      });
      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: 'Write copy',
          creatorId: owner.id,
          assigneeId: member.id,
        },
      });

      await removeMember(owner, member.id).expect(204);

      const updated = await prisma.task.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(updated.assigneeId).toBeNull();
    });

    it('refuses to remove the last owner', async () => {
      await removeMember(owner, owner.id).expect(409);
    });

    it('forbids members from removing anyone', async () => {
      await removeMember(member, owner.id).expect(403);
    });

    it('returns 404 for a user who is not a member', async () => {
      await removeMember(owner, randomUUID()).expect(404);
    });
  });
});
