const UNIT_MS = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

export const DURATION_PATTERN = /^(\d+)([smhd])$/;

export function durationToMs(duration: string): number {
  const match = DURATION_PATTERN.exec(duration);
  if (!match) {
    throw new Error(`Unsupported duration: ${duration}`);
  }
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}
