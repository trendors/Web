import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignCheckoutService } from '../payment/campaign-checkout.service';

export type EscrowStatus = 'held' | 'partially_released' | 'released' | 'refunded' | 'disputed';

export interface EscrowView {
  id: number;
  amount: number;
  released: number;
  platform_fee: number;
  refunded: number;
  /** What is still held: amount - released - platform_fee - refunded. */
  held: number;
  currency: string;
  status: EscrowStatus;
  dispute_reason: string | null;
  disputed_by: 'brand' | 'influencer' | null;
}

type FundCheckout =
  | { status: 'funded' }
  | {
      status: 'payment_required';
      amount: number;
      reference: string;
      accessCode: string | null;
      authorizationUrl: string | null;
      email: string;
    };

/** funded – the escrow now holds the fee. cancelled – card popup closed, nothing charged. pending – charged, confirmation on its way. */
export type FundOutcome = 'funded' | 'cancelled' | 'pending';

/** Pulls the server's message out of an HTTP error so screens can show it as is. */
export function apiErrorMessage(err: any, fallback: string): string {
  const message = err?.error?.message;
  return (Array.isArray(message) ? message.join(', ') : message) || fallback;
}

/**
 * Escrow for a contracted assignment. The server decides everything that moves
 * money (wallet vs card, amounts, who may act); this only drives the screens.
 */
@Injectable({ providedIn: 'root' })
export class EscrowService {
  private readonly http = inject(HttpClient);
  private readonly checkout = inject(CampaignCheckoutService);
  private readonly url = `${environment.apiUrl}/escrow`;

  /** How long to wait for a card payment to be confirmed before reporting `pending`. */
  confirmTimeoutMs = 90_000;
  pollEveryMs = 4_000;

  /** The assignment's escrow, or null when none has been funded. Errors read as "none". */
  get(assignmentId: number): Observable<EscrowView | null> {
    return this.http.get<{ data: EscrowView | null }>(`${this.url}/assignment/${assignmentId}`).pipe(
      map((res) => this.normalize(res?.data)),
      catchError(() => of(null)),
    );
  }

  /** Brand funds the agreed fee: from the wallet if it covers it, otherwise by card for the shortfall. */
  async fund(assignmentId: number, expectedTotal = 0): Promise<FundOutcome> {
    const res = await firstValueFrom(
      this.http.post<{ data: FundCheckout }>(`${this.url}/assignment/${assignmentId}/fund`, {}),
    );
    const checkout = res?.data;
    if (!checkout || checkout.status === 'funded') return 'funded';

    const card = await this.checkout.openCard(checkout as any);
    if (card === 'closed') return 'cancelled';
    return (await this.waitUntilFunded(assignmentId, expectedTotal)) ? 'funded' : 'pending';
  }

  /** Brand or influencer freezes the held money until an admin decides. */
  dispute(assignmentId: number, reason: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.url}/assignment/${assignmentId}/dispute`, { reason }));
  }

  /** Admin: `influencerAmount` goes to the influencer, the rest back to the brand. */
  resolve(escrowId: number, influencerAmount: number): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${this.url}/${escrowId}/resolve`, { influencer_amount: influencerAmount }),
    );
  }

  /** Brand sends submitted work back (limited number of times). */
  requestChanges(postId: number, note: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${environment.apiUrl}/campaign-influencer-post/${postId}/request-changes`, { note }),
    );
  }

  /** Waits until the escrow exists and holds at least `expectedTotal` (a top-up changes the amount, not the existence). */
  private async waitUntilFunded(assignmentId: number, expectedTotal: number): Promise<boolean> {
    const deadline = Date.now() + this.confirmTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, this.pollEveryMs));
      const escrow = await firstValueFrom(this.get(assignmentId));
      if (escrow && escrow.amount + 0.001 >= expectedTotal) return true;
    }
    return false;
  }

  private normalize(raw: any): EscrowView | null {
    if (!raw) return null;
    const n = (v: unknown) => Number(v) || 0;
    return {
      id: raw.id,
      amount: n(raw.amount),
      released: n(raw.released),
      platform_fee: n(raw.platform_fee),
      refunded: n(raw.refunded),
      held: n(raw.held),
      currency: raw.currency ?? 'NGN',
      status: raw.status,
      dispute_reason: raw.dispute_reason ?? null,
      disputed_by: raw.disputed_by ?? null,
    };
  }
}
