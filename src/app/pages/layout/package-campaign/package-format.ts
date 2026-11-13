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
