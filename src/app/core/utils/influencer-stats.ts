/**
 * Defensive extraction of influencer display stats from the many shapes the
 * backend may return. Every helper tolerates missing data and returns null
 * (or '') so callers can simply hide absent stats.
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return null;
    const match = cleaned.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      const lower = cleaned.toLowerCase();
      if (lower.includes('m')) return parsed * 1_000_000;
      if (lower.includes('k')) return parsed * 1_000;
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

const PROFILE_KEYS = [
  'influencerProfile',
  'influncerProfile',
  'creativeProfile',
  'creative_profile',
  'influencer_profile',
];

function firstProfile(user: Record<string, unknown>): Record<string, unknown> {
  for (const key of PROFILE_KEYS) {
    const value = user[key];
    if (value != null && typeof value === 'object') return value as Record<string, unknown>;
  }
  return {};
}

/** Follower count from media data, profile or flat user fields. */
export function extractFollowers(user: unknown): number | null {
  const record = asRecord(user);
  const candidates: unknown[] = [
    record['followers'],
    record['followers_count'],
    record['followersCount'],
    record['followerCount'],
    record['follower_count'],
  ];
  const profile = firstProfile(record);
  candidates.push(
    profile['followers'],
    profile['followers_count'],
    profile['followersCount'],
    profile['audienceSize'],
  );
  const media = record['users_media_data'];
  if (Array.isArray(media)) {
    for (const entry of media) {
      const item = asRecord(entry);
      candidates.push(item['followers_count'], item['followers'], item['followersCount']);
    }
  }
  let best: number | null = null;
  for (const candidate of candidates) {
    const parsed = num(candidate);
    if (parsed != null && parsed >= 0 && (best == null || parsed > best)) best = parsed;
  }
  return best;
}

/** Engagement rate normalized to a "3.8%" display string, or ''. */
export function extractEngagementRate(user: unknown): string {
  const record = asRecord(user);
  const profile = firstProfile(record);
  const raw =
    profile['averageEngagementRate'] ??
    profile['averageEngagement'] ??
    profile['engagementRate'] ??
    profile['engagement_rate'] ??
    record['engagementRate'] ??
    record['engagement_rate'];
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return `${Number(raw.toFixed(1))}%`;
  }
  const text = String(raw).trim();
  if (!text) return '';
  if (text.includes('%')) return text;
  const parsed = num(text);
  return parsed != null ? `${Number(parsed.toFixed(1))}%` : text;
}

/** Niche/category tag from content niches or professional headline. */
export function extractNiche(user: unknown): string {
  const record = asRecord(user);
  const profile = firstProfile(record);
  const niches = profile['contentNiches'] ?? profile['content_niches'] ?? profile['niches'];
  if (Array.isArray(niches)) {
    const first = niches.map(String).map((s) => s.trim()).find(Boolean);
    if (first) return first;
  } else if (typeof niches === 'string' && niches.trim()) {
    return niches.trim();
  }
  const headline = profile['professionalHeadline'] ?? profile['professional_headline'];
  if (typeof headline === 'string' && headline.trim()) return headline.trim();
  return '';
}

/** Compact number for stats: 24.5K, 1.2M. */
export function formatCompactNumber(count: number): string {
  if (count >= 1_000_000) return `${Number((count / 1_000_000).toFixed(1))}M`;
  if (count >= 1_000) return `${Number((count / 1_000).toFixed(1))}K`;
  return String(count);
}
