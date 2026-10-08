import { formatHumanDate, parseCalendarDate, relativeDay } from './human-date';

describe('human-date', () => {
  const now = new Date(2026, 2, 10, 15, 30); // 10 Mar 2026, mid-afternoon

  it('reads date-only values as local calendar days', () => {
    const d = parseCalendarDate('2026-03-14')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 14]);
  });

  it('formats a readable date and tolerates junk', () => {
    expect(formatHumanDate('2026-03-14')).toBe('Sat, Mar 14, 2026');
    expect(formatHumanDate('2026-03-14T09:00:00.000Z')).toContain('Mar');
    expect(formatHumanDate(null)).toBe('');
    expect(formatHumanDate('not a date')).toBe('');
  });

  it.each([
    ['2026-03-10', 'today', 'soon'],
    ['2026-03-11', 'tomorrow', 'soon'],
    ['2026-03-09', 'yesterday', 'overdue'],
    ['2026-03-14', 'in 4 days', 'soon'],
    ['2026-03-20', 'in 10 days', 'later'],
    ['2026-04-07', 'in 4 weeks', 'later'],
    ['2026-06-10', 'in 3 months', 'later'],
    ['2026-03-05', '5 days ago', 'overdue'],
    ['2026-01-10', '2 months ago', 'overdue'],
  ])('describes %s as "%s"', (date, text, tone) => {
    expect(relativeDay(date, now)).toEqual({ text, tone });
  });

  it('returns null without a usable date', () => {
    expect(relativeDay('', now)).toBeNull();
    expect(relativeDay(undefined, now)).toBeNull();
  });
});
