/**
 * Pull the record list out of the backend's response envelopes.
 *
 * Seen shapes include `{ data: [...] }`, `{ data: { list: [...] } }` and
 * renamed wrappers (e.g. `{ data: { assignments: [...] } }` once relations are
 * populated), so this checks known keys first and then falls back to the first
 * array-valued property instead of silently returning nothing.
 */
const LIST_KEYS = ['list', 'items', 'rows', 'docs', 'results', 'records', 'data', 'assignments'];

export function extractApiList(res: unknown): any[] {
  const data = (res as any)?.data ?? res;
  if (Array.isArray(data)) return data;
  if (data != null && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      if (Array.isArray(record[key])) return record[key] as any[];
    }
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) return value;
    }
  }
  return [];
}
