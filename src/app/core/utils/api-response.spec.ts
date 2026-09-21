import { extractApiList } from './api-response';

describe('extractApiList', () => {
  const rows = [{ id: 1 }, { id: 2 }];

  it('should unwrap a bare array', () => {
    expect(extractApiList(rows)).toBe(rows);
  });

  it.each(['list', 'items', 'rows', 'docs', 'results', 'records'])(
    'should unwrap data.%s envelopes',
    (key) => {
      expect(extractApiList({ message: 'ok', error: false, data: { [key]: rows } })).toBe(rows);
    },
  );

  it('should unwrap data arrays and renamed wrappers', () => {
    expect(extractApiList({ message: 'ok', error: false, data: rows })).toBe(rows);
    expect(
      extractApiList({ message: 'ok', error: false, data: { assignments: rows } }),
    ).toBe(rows);
  });

  it('should return [] for empty or unrecognized payloads', () => {
    expect(extractApiList(null)).toEqual([]);
    expect(extractApiList(undefined)).toEqual([]);
    expect(extractApiList({ message: 'ok', error: false, data: null })).toEqual([]);
    expect(extractApiList({ message: 'ok', error: false })).toEqual([]);
  });
});
