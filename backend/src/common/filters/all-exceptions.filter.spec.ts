import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

  it('hides the details of unknown errors', () => {
    const body = run(new Error('connection string postgresql://secret'));

    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('hides the raw message of unmapped database errors', () => {
    const body = run(prismaError('P9999'));

    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('raw database message');
  });
});
