import { toLocalDateString } from './date';

describe('toLocalDateString', () => {
  it('keeps the local calendar day for local midnight', () => {
    expect(toLocalDateString(new Date(2026, 9, 10))).toBe('2026-10-10');
  });

  it('pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
