/**
 * Parses the short duration strings used in configuration (`7d`, `12h`,
 * `30m`, `45s`, or a bare number of seconds) into whole seconds.
 *
 * Returning a number keeps `jsonwebtoken`'s `expiresIn` and Express's
 * `maxAge` type-safe without casting.
 */
export function durationToSeconds(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return fallback;

  const amount = Number(match[1]);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  return amount * (multipliers[match[2] ?? 's'] ?? 1);
}

export const DEFAULT_JWT_TTL_SECONDS = 7 * 24 * 60 * 60;
