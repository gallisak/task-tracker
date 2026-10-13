import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

interface NormalizedError {
  status: number;
  message: string;
  details?: string[];
}

const PRISMA_ERRORS: Record<string, NormalizedError> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Resource already exists' },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'Operation conflicts with a related resource',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Resource not found' },
};

const INTERNAL_ERROR: NormalizedError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  message: 'Internal server error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { status, message, details } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      error: STATUS_CODES[status] ?? 'Error',
      message,
      ...(details ? { details } : {}),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return PRISMA_ERRORS[exception.code] ?? INTERNAL_ERROR;
    }
    return this.fromClientError(exception) ?? INTERNAL_ERROR;
  }

  private fromClientError(exception: unknown): NormalizedError | null {
    if (typeof exception !== 'object' || exception === null) {
      return null;
    }

    const { status } = exception as { status?: unknown };
    if (
      typeof status !== 'number' ||
      !Number.isInteger(status) ||
      status < HttpStatus.BAD_REQUEST ||
      status >= HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      return null;
    }
    return { status, message: STATUS_CODES[status] ?? 'Request failed' };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === 'object' && payload !== null) {
      const { message } = payload as { message?: string | string[] };
      if (Array.isArray(message)) {
        return { status, message: 'Validation failed', details: message };
      }
      if (typeof message === 'string') {
        return { status, message };
      }
    }
    return { status, message: exception.message };
  }
}
