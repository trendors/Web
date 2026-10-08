/**
 * 'YYYY-MM-DD' in the user's local time zone. `toISOString()` converts to UTC
 * first, which turns a local-midnight date into the previous day in UTC+
 * zones such as WAT (Nigeria).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
