import { campaignPhase } from './campaign-phase';

describe('campaignPhase', () => {
  const now = new Date(2026, 9, 10, 15, 0); // 10 Oct 2026, local

  it('is active within the date range, inclusive', () => {
    expect(campaignPhase({ start_date: '2026-10-10', end_date: '2026-10-10' }, now)).toBe('active');
    expect(campaignPhase({ start_date: '2026-10-01', end_date: '2026-10-31' }, now)).toBe('active');
  });

  it('is ended after the end date and upcoming before the start', () => {
    expect(campaignPhase({ start_date: '2026-09-01', end_date: '2026-10-09' }, now)).toBe('ended');
    expect(campaignPhase({ start_date: '2026-10-11', end_date: '2026-10-31' }, now)).toBe('upcoming');
  });

  it('handles open-ended and undated campaigns', () => {
    expect(campaignPhase({ start_date: '2026-10-01', end_date: null }, now)).toBe('active');
    expect(campaignPhase({ start_date: null, end_date: null }, now)).toBe('undated');
  });
});
