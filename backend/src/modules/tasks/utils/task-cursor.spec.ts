import { BadRequestException } from '@nestjs/common';
import { decodeTaskCursor, encodeTaskCursor } from './task-cursor.js';

const position = {
  createdAt: new Date('2026-10-13T08:29:34.464Z'),
  id: '01a13461-9b44-7009-a8f6-17e10aa64d6d',
};

describe('task cursor', () => {
  it('restores the position it was built from', () => {
    expect(decodeTaskCursor(encodeTaskCursor(position))).toEqual(position);
  });

  it('is safe to put into a URL', () => {
    expect(encodeTaskCursor(position)).toMatch(/^[\w-]+$/);
  });

  it.each([
    ['plain text', 'next-page'],
    [
      'a missing id',
      Buffer.from('2026-10-13T08:29:34.464Z').toString('base64url'),
    ],
    [
      'an invalid date',
      Buffer.from(`yesterday|${position.id}`).toString('base64url'),
    ],
    [
      'an invalid id',
      Buffer.from('2026-10-13T08:29:34.464Z|42').toString('base64url'),
    ],
  ])('rejects %s', (_name, cursor) => {
    expect(() => decodeTaskCursor(cursor)).toThrow(BadRequestException);
  });
});
