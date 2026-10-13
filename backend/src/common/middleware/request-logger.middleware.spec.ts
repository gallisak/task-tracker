import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';

function run(originalUrl: string, statusCode: number) {
  const middleware = new RequestLoggerMiddleware();
  const logger = middleware['logger'];
  const log = vi.spyOn(logger, 'log').mockImplementation(() => undefined);
  const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

  const response = Object.assign(new EventEmitter(), { statusCode });
  const next = vi.fn();
  middleware.use(
    { method: 'GET', originalUrl } as Request,
    response as unknown as Response,
    next,
  );
  response.emit('finish');

  return { log, warn, error, next };
}

describe('RequestLoggerMiddleware', () => {
  it('logs the method, path, status and duration of a request', () => {
    const { log, next } = run('/api/workspaces?page=2', 200);

    expect(next).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/api\/workspaces 200 \d+ms$/),
    );
  });

  it('leaves the query string out of the log', () => {
    const { log } = run('/api/tasks?token=secret', 200);

    expect(log.mock.calls[0][0]).not.toContain('secret');
  });

  it('raises the level for client and server errors', () => {
    expect(run('/api/tasks/1', 404).warn).toHaveBeenCalledOnce();
    expect(run('/api/tasks/1', 500).error).toHaveBeenCalledOnce();
  });

  it('stays silent for health checks', () => {
    const { log, warn, error } = run('/api/health', 200);

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
