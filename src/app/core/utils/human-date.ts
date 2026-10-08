/**
 * Human-readable dates. Date-only values ("2026-03-14", what `date` columns
 * return) are read as local calendar days so they never slip a day across time zones.
 */
export function parseCalendarDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Sat, Mar 14, 2026" */
export function formatHumanDate(value: unknown): string {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export interface RelativeDay {
  /** "in 3 days", "tomorrow", "today", "2 weeks ago"… */
  text: string;
  tone: 'overdue' | 'soon' | 'later';
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function span(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 42) return `${Math.round(days / 7)} weeks`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'}`;
}

/** How far a date is from today, in words. `now` is injectable for tests. */
export function relativeDay(value: unknown, now: Date = new Date()): RelativeDay | null {
  const date = parseCalendarDate(value);
  if (!date) return null;
  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return { text: 'today', tone: 'soon' };
  if (days === 1) return { text: 'tomorrow', tone: 'soon' };
  if (days === -1) return { text: 'yesterday', tone: 'overdue' };
  if (days > 1) return { text: `in ${span(days)}`, tone: days <= 7 ? 'soon' : 'later' };
  return { text: `${span(-days)} ago`, tone: 'overdue' };
}
