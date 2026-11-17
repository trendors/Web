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
