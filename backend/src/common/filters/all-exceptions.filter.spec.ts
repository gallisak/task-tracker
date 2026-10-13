import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Prisma } from '../../generated/prisma/client.js';
import {
  AllExceptionsFilter,
  ErrorResponseBody,
} from './all-exceptions.filter.js';

function run(exception: unknown): ErrorResponseBody {
  const json = vi.fn();
  const response = { status: vi.fn().mockReturnValue({ json }) };
  const request = { method: 'GET', originalUrl: '/api/things/1' };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  const filter = new AllExceptionsFilter();
  vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
  filter.catch(exception, host);

  const body = json.mock.calls[0][0] as ErrorResponseBody;
  expect(response.status).toHaveBeenCalledWith(body.statusCode);
  return body;
}

function socketHost(
  emit: ReturnType<typeof vi.fn>,
  acknowledge?: ReturnType<typeof vi.fn>,
): ArgumentsHost {
  const client = { emit };
  const args = [client, {}, ...(acknowledge ? [acknowledge] : []), 'message'];
  return {
    getType: () => 'ws',
    getArgs: () => args,
    switchToWs: () => ({ getClient: () => client }),
  } as unknown as ArgumentsHost;
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('raw database message', {
    code,
    clientVersion: 'test',
  });
}

describe('AllExceptionsFilter', () => {
  it('keeps the status and message of an HTTP exception', () => {
    const body = run(new NotFoundException('Task not found'));

    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Task not found',
      path: '/api/things/1',
    });
    expect(body.details).toBeUndefined();
  });

  it('moves validation messages into details', () => {
    const body = run(
      new BadRequestException(['email must be an email', 'name is too short']),
    );

    expect(body).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      details: ['email must be an email', 'name is too short'],
    });
  });

  it('maps a unique constraint violation to 409', () => {
    const body = run(prismaError('P2002'));

    expect(body).toMatchObject({
      statusCode: 409,
      message: 'Resource already exists',
    });
  });

  it('maps a missing record to 404', () => {
    expect(run(prismaError('P2025')).statusCode).toBe(404);
  });

  it('keeps the client status of errors raised by Express middleware', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
    });

    expect(run(tooLarge)).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'Payload Too Large',
    });
  });

  it('does not trust a server status carried by an unknown error', () => {
    const upstream = Object.assign(new Error('upstream secret'), {
      status: 502,
    });
    const body = run(upstream);

    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('hides the details of unknown errors', () => {
    const body = run(new Error('connection string postgresql://secret'));

    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('answers a failed realtime message on the socket instead of an HTTP response', () => {
    const emit = vi.fn();
    const host = socketHost(emit);

    const filter = new AllExceptionsFilter();
    const logError = vi
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);
    filter.catch(new Error('connection string postgresql://secret'), host);

    expect(emit).toHaveBeenCalledWith('exception', {
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected realtime message as a client error without logging it', () => {
    const emit = vi.fn();
    const host = socketHost(emit);

    const filter = new AllExceptionsFilter();
    const logError = vi
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);
    filter.catch(new WsException('Invalid project id'), host);

    expect(emit).toHaveBeenCalledWith('exception', {
      statusCode: 400,
      message: 'Invalid project id',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('acknowledges a failed realtime message when the client waits for it', () => {
    const emit = vi.fn();
    const acknowledge = vi.fn();
    const host = socketHost(emit, acknowledge);

    const filter = new AllExceptionsFilter();
    vi.spyOn(filter['logger'], 'error').mockImplementation(() => undefined);
    filter.catch(new Error('boom'), host);

    expect(acknowledge).toHaveBeenCalledWith({
      ok: false,
      error: 'Internal server error',
    });
    expect(emit).toHaveBeenCalledWith('exception', {
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('keeps validation details in a realtime error', () => {
    const emit = vi.fn();
    const host = socketHost(emit);

    new AllExceptionsFilter().catch(
      new BadRequestException(['projectId must be a UUID']),
      host,
    );

    expect(emit).toHaveBeenCalledWith('exception', {
      statusCode: 400,
      message: 'Validation failed',
      details: ['projectId must be a UUID'],
    });
  });

  it('hides the raw message of unmapped database errors', () => {
    const body = run(prismaError('P9999'));

    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('raw database message');
  });
});
