import { toLocalDateString } from './date';

export type CampaignPhase = 'upcoming' | 'active' | 'ended' | 'undated';

/**
 * Where a campaign is in its run, from its start/end dates (compared as
 * local calendar days, inclusive). `access` is how creators join, not
 * whether the campaign is running, so it must not be used for this.
 */
export function campaignPhase(
  campaign: { start_date?: string | null; end_date?: string | null },
  now: Date = new Date(),
): CampaignPhase {
  const today = toLocalDateString(now);
  const start = campaign.start_date?.slice(0, 10) || null;
  const end = campaign.end_date?.slice(0, 10) || null;
  if (!start && !end) return 'undated';
  if (end && end < today) return 'ended';
  if (start && start > today) return 'upcoming';
  return 'active';
}
