/**
 * Parse a short duration string (e.g. "15m", "30d", "10h", "45s") into
 * milliseconds. A bare number is treated as milliseconds. Used for JWT/refresh
 * TTLs so config can stay human-readable in .env.
 */
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(value: string): number {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid duration string: "${value}" (expected e.g. 15m, 30d)`);
  }
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  return amount * UNIT_MS[unit]!;
}

export function parseDurationSeconds(value: string): number {
  return Math.floor(parseDurationMs(value) / 1000);
}
