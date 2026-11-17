import { Lifecycle } from '../../../core/models/package/package.model';

export const naira = (n: number | string | null | undefined) => `₦${(Number(n) || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

const LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', awaiting_payment: 'Awaiting payment', active: 'Active',
  closing: 'Closing', completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
  applied: 'Applied', invited: 'Invited', selected: 'Offer sent', declined: 'Declined', not_selected: 'Not selected', expired: 'Expired', withdrawn: 'Withdrawn',
  awaiting_submission: 'Awaiting submission', in_review: 'In review', revision_requested: 'Revision requested', awaiting_publication: 'Awaiting publication',
  rejected: 'Rejected', published: 'Published, awaiting verification', verified: 'Verified',
  reserved: 'Reserved', earned: 'Earned', paid: 'Paid', released: 'Returned', disputed_fee: 'Disputed',
  not_reached: 'Not reached', approved: 'Approved', payable: 'Payable', pending: 'Pending',
};
export const label = (s: string | null | undefined) => (s ? LABELS[s] ?? s.replace(/_/g, ' ') : '');

/** Colour of a status pill. */
export function tone(s: string | null | undefined): 'green' | 'amber' | 'red' | 'blue' | '' {
  switch (s) {
    case 'active': case 'completed': case 'verified': case 'paid': case 'approved': case 'resolved': return 'green';
    case 'under_review': case 'awaiting_payment': case 'in_review': case 'revision_requested': case 'awaiting_publication': case 'published':
    case 'invited': case 'selected': case 'applied': case 'pending': case 'closing': case 'earned': return 'amber';
    case 'cancelled': case 'rejected': case 'declined': case 'expired': case 'disputed': case 'withdrawn': case 'not_selected': return 'red';
    case 'draft': case 'submitted': return 'blue';
    default: return '';
  }
}

export const LIVE_STATES: Lifecycle[] = ['active', 'closing', 'disputed'];

export function timeLeft(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export function errText(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const body = err?.error;
  const list: string[] | undefined = body?.errors;
  if (Array.isArray(list) && list.length) return list.join(' ');
  const m = body?.message ?? err?.message;
  return (Array.isArray(m) ? m.join(', ') : m) || fallback;
}

/** Platform names as people know them; "twitter" is X now. */
export function platformName(p: string | null | undefined): string {
  const key = String(p ?? '').toLowerCase();
  const names: Record<string, string> = { twitter: 'X', x: 'X', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook' };
  return names[key] ?? (key ? key[0].toUpperCase() + key.slice(1) : '');
}

/**
 * Platforms as readable names: "X, Instagram". Older campaigns store the list as a JSON string inside
 * the array (["[\"twitter\"]"]), so an entry that looks like JSON is unpacked first.
 */
export function platformsText(list: unknown): string {
  const flat: string[] = [];
  const add = (v: unknown): void => {
    if (Array.isArray(v)) { v.forEach(add); return; }
    const s = String(v ?? '').trim();
    if (!s) return;
    if (s.startsWith('[')) {
      try { add(JSON.parse(s)); return; } catch { /* not JSON: use as written */ }
    }
    flat.push(s.replace(/^["']|["']$/g, ''));
  };
  add(list);
  return [...new Set(flat.map(platformName).filter(Boolean))].join(', ');
}

/** Follower counts short and readable: 980, 15.4k, 1.2M. */
export function compact(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return `${+(v / 1000).toFixed(v < 10_000 ? 1 : 0)}k`;
  return `${+(v / 1_000_000).toFixed(1)}M`;
}

/** Money short enough for a tile: ₦1,500, ₦99,999, ₦272.7k, ₦1.2M. The exact amount belongs in a tooltip. */
export function nairaShort(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a < 100_000) return `${sign}₦${Math.round(a).toLocaleString('en-NG')}`;
  if (a < 1_000_000) return `${sign}₦${+(a / 1000).toFixed(1)}k`;
  if (a < 1_000_000_000) return `${sign}₦${+(a / 1_000_000).toFixed(1)}M`;
  return `${sign}₦${+(a / 1_000_000_000).toFixed(1)}B`;
}

/** "1 post on Instagram", "1 post and 2 stories on Instagram", "2 posts on X and TikTok". */
export function postsText(posts: { content_type: string; platform: string; quantity: number }[] | null | undefined): string {
  const list = posts ?? [];
  if (!list.length) return '';
  const byType = new Map<string, number>();
  for (const p of list) byType.set(p.content_type, (byType.get(p.content_type) ?? 0) + (Number(p.quantity) || 0));
  const things = [...byType].map(([type, n]) => `${n} ${n === 1 ? type : type.endsWith('y') ? type.slice(0, -1) + 'ies' : type + 's'}`);
  const where = [...new Set(list.map((p) => platformName(p.platform)))];
  const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  return `${join(things)} on ${join(where)}`;
}

/** "3 days", "6 hours". */
export function hoursText(h: number | null | undefined): string {
  if (!h) return '';
  return h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} hour${h === 1 ? '' : 's'}`;
}

/** The offer on one line, for a card: "₦6,000 for 1 post on Instagram · up to ₦6,000 more in rewards". */
export function termsLine(t: { baseFee: number; posts: { content_type: string; platform: string; quantity: number }[]; rewardTotal: number } | null | undefined): string {
  if (!t) return '';
  const parts = [`${naira(t.baseFee)} for ${postsText(t.posts) || 'the work'}`];
  if (t.rewardTotal > 0) parts.push(`up to ${naira(t.rewardTotal)} more in rewards`);
  return parts.join(' · ');
}

/** "Fashion, Gaming or Parenting". */
const orList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/**
 * What a campaign asks of creators, one item per requirement, each marked met (true), not met (false)
 * or unknown (null) for the viewer, from the same checks Find campaigns shows.
 */
export function requirementsOf(row: {
  requirements?: { niches: string[]; creatorCountries: string[]; audienceCountries: string[]; followerMin: number | null; followerMax: number | null; platforms: string[] };
  evaluation?: { checks: { key: string; passed: boolean }[] };
}): { key: string; text: string; met: boolean | null }[] {
  const r = row.requirements;
  if (!r) return [];
  const met = (key: string) => { const c = row.evaluation?.checks.find((x) => x.key === key); return c ? c.passed : null; };
  const where = r.platforms.length ? ` on ${orList(r.platforms.map((p) => platformName(p)))}` : '';
  const out: { key: string; text: string; met: boolean | null }[] = [];
  const fmt = (n: number) => n.toLocaleString('en-NG');
  if (r.followerMin != null || r.followerMax != null) {
    const range = r.followerMin != null && r.followerMax != null ? `${fmt(r.followerMin)}–${fmt(r.followerMax)}`
      : r.followerMin != null ? `${fmt(r.followerMin)}+` : `Up to ${fmt(r.followerMax!)}`;
    out.push({ key: 'followers', text: `${range} followers${where}`, met: met('followers') });
  } else if (r.platforms.length) {
    out.push({ key: 'platform', text: `An account${where}`, met: met('platform') });
  }
  if (r.niches.length) out.push({ key: 'niche', text: orList(r.niches), met: met('niche') });
  if (r.creatorCountries.length) out.push({ key: 'creator_location', text: `Based in ${orList(r.creatorCountries)}`, met: met('creator_location') });
  if (r.audienceCountries.length) out.push({ key: 'audience_location', text: `Audience in ${orList(r.audienceCountries)}`, met: met('audience_location') });
  return out;
}
