import { Injectable, inject } from '@angular/core';
import { filter, firstValueFrom, interval, map, merge, race, switchMap, take, timer, catchError, of } from 'rxjs';
import { CampaignService as CampaignApi } from '../../api';
import { environment } from '../../../../environments/environment';
import { RealtimeEvent, SocketService } from '../../../socket.service';

declare const PaystackPop: any;

export type CheckoutResponse =
  | { status: 'paid'; alreadyPaid: boolean; budget: number }
  | {
      status: 'payment_required';
      budget: number;
      balance: number;
      amount: number;
      reference: string;
      accessCode: string | null;
      authorizationUrl: string | null;
      email: string;
    };

/** Where a payment is up to, for the button/label on screen. */
export type CheckoutStep = 'starting' | 'card' | 'confirming';

/**
 * paid      – the campaign is paid and live.
 * cancelled – the brand closed the card popup; nothing was charged, the campaign stays saved.
 * pending   – the card was charged but confirmation is still on its way; a notification follows.
 */
export type CheckoutOutcome = 'paid' | 'cancelled' | 'pending';

/**
 * Paying for a campaign from the browser. The server decides everything that
 * matters (amount, wallet vs card); this only drives the flow:
 *
 *  1. ask the server to check out; if the wallet covered it, done;
 *  2. otherwise open Paystack for the shortfall the server initialized;
 *  3. wait for the server to confirm (live socket push, with polling as a
 *     fallback). The popup's own "success" is never trusted as proof.
 */
@Injectable({ providedIn: 'root' })
export class CampaignCheckoutService {
  private readonly api = inject(CampaignApi);
  private readonly socket = inject(SocketService);

  /** How long to wait for confirmation before reporting `pending`. */
  confirmTimeoutMs = 90_000;
  pollEveryMs = 4_000;

  async pay(campaignId: number, onStep?: (step: CheckoutStep) => void): Promise<CheckoutOutcome> {
    onStep?.('starting');
    const res = await firstValueFrom(this.api.campaignControllerCheckout(campaignId));
    const checkout = ((res as any)?.data ?? res) as CheckoutResponse;
    if (checkout.status === 'paid') return 'paid';

    onStep?.('card');
    const card = await this.openCard(checkout);
    if (card === 'closed') return 'cancelled';

    onStep?.('confirming');
    return (await this.waitUntilPaid(campaignId)) ? 'paid' : 'pending';
  }

  /** Paystack popup for the transaction the server initialized. */
  openCard(checkout: Extract<CheckoutResponse, { status: 'payment_required' }>): Promise<'submitted' | 'closed'> {
    return new Promise((resolve, reject) => {
      if (typeof PaystackPop === 'undefined' || typeof PaystackPop.setup !== 'function') {
        reject(new Error('The payment window could not load. Check your connection and try again.'));
        return;
      }
      if (!environment.paystackPublicKey) {
        reject(new Error('Payments are not available right now. Please try again later.'));
        return;
      }
      const handler = PaystackPop.setup({
        key: environment.paystackPublicKey,
        email: checkout.email,
        amount: Math.round(checkout.amount * 100), // kobo, exactly what the server initialized
        ref: checkout.reference,
        currency: 'NGN',
        channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr'],
        callback: () => resolve('submitted'),
        onClose: () => resolve('closed'),
      });
      handler.openIframe();
    });
  }

  /** Resolves true once the server says the campaign is paid; false on timeout. */
  waitUntilPaid(campaignId: number): Promise<boolean> {
    const pushed = this.socket
      .changes(RealtimeEvent.CampaignUpdated)
      .pipe(filter((c) => c.campaignId === campaignId && c.payment === 'paid'));
    const polled = interval(this.pollEveryMs).pipe(
      switchMap(() =>
        this.api.campaignControllerPaymentStatus(campaignId).pipe(catchError(() => of(null))),
      ),
      filter((res: any) => (res?.data ?? res)?.paymentStatus === 'paid'),
    );
    return firstValueFrom(
      race(
        merge(pushed, polled).pipe(map(() => true)),
        timer(this.confirmTimeoutMs).pipe(map(() => false)),
      ).pipe(take(1)),
    );
  }
}
