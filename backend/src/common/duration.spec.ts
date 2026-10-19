import { DEFAULT_JWT_TTL_SECONDS, durationToSeconds } from './duration';

describe('durationToSeconds', () => {
  it('parses the supported units', () => {
    expect(durationToSeconds('45s', 1)).toBe(45);
    expect(durationToSeconds('30m', 1)).toBe(1800);
    expect(durationToSeconds('12h', 1)).toBe(43200);
    expect(durationToSeconds('7d', 1)).toBe(604800);
  });

  it('treats a bare number as seconds', () => {
    expect(durationToSeconds('120', 1)).toBe(120);
  });

  it('tolerates surrounding whitespace', () => {
    expect(durationToSeconds('  7d  ', 1)).toBe(604800);
  });

  it('falls back for missing or malformed values', () => {
    expect(durationToSeconds(undefined, 99)).toBe(99);
    expect(durationToSeconds('', 99)).toBe(99);
    expect(durationToSeconds('seven days', 99)).toBe(99);
    expect(durationToSeconds('7w', 99)).toBe(99);
  });

  it('defaults to one week', () => {
    expect(DEFAULT_JWT_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
  });
});
