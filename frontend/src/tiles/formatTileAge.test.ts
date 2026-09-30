import { describe, expect, it } from 'vitest';
import { formatTileAge } from './formatTileAge.ts';

const NOW = new Date('2026-09-30T12:00:00Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function ago(ms: number) {
  return new Date(NOW.getTime() - ms).toISOString();
}

describe('formatTileAge', () => {
  it.each([
    ['just under 1 min', MINUTE - SECOND, 'just now'],
    ['exactly 1 min', MINUTE, '1m ago'],
    ['just under 1 h', HOUR - SECOND, '59m ago'],
    ['exactly 1 h', HOUR, '1h ago'],
    ['just under 1 d', DAY - SECOND, '23h ago'],
    ['exactly 1 d', DAY, '1d ago'],
    ['just under 7 d', 7 * DAY - SECOND, '6d ago'],
  ])('%s → %s', (_label, elapsed, expected) => {
    expect(formatTileAge(ago(elapsed), NOW)).toBe(expected);
  });

  it('shows a short date at 7 days or older', () => {
    const createdAt = new Date(2026, 8, 12, 9, 30).toISOString();
    const now = new Date(2026, 8, 19, 9, 30);
    expect(formatTileAge(createdAt, now)).toBe('12 Sep');
  });

  it('adds the year for dates outside the current year', () => {
    const createdAt = new Date(2025, 11, 20, 9, 30).toISOString();
    const now = new Date(2026, 0, 5, 9, 30);
    expect(formatTileAge(createdAt, now)).toBe('20 Dec 2025');
  });

  it('treats a timestamp in the future as just now', () => {
    expect(formatTileAge(ago(-5 * MINUTE), NOW)).toBe('just now');
  });
});
