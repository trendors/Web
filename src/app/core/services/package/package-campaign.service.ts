import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignCheckoutService } from '../payment/campaign-checkout.service';
import {
  CheckoutResult, CollabState, ContentItem, Discover, Dispute, Matches, MetricInput,
  MyCollab, MyWork, OfferTerms, PackageInfo, PlanForm, PlanSummary, RewardsView, RosterRow, Transition, WorkflowEvent,
} from '../../models/package/package.model';

/** How a payment attempt ended, for the button on screen. */
export type PayOutcome = 'paid' | 'cancelled' | 'pending';

/**
 * Everything the package-campaign screens call. The server decides who may do
 * what and moves all money; this only sends the request and unwraps `{ data }`.
 */
@Injectable({ providedIn: 'root' })
export class PackageCampaignService {
  private readonly http = inject(HttpClient);
  private readonly checkout = inject(CampaignCheckoutService);
  private readonly api = environment.apiUrl;

  /** How long to wait for a card payment to be confirmed. */
  confirmTimeoutMs = 90_000;
  pollEveryMs = 4_000;

  private get<T>(path: string, params?: Record<string, string | number | boolean>) {
    return firstValueFrom(this.http.get<{ data: T }>(`${this.api}${path}`, { params: params as any }).pipe(map((r) => r?.data as T)));
  }
  private post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<{ data: T }>(`${this.api}${path}`, body).pipe(map((r) => r?.data as T)));
  }
  private patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<{ data: T }>(`${this.api}${path}`, body).pipe(map((r) => r?.data as T)));
  }

  /* ------------------------------------------------------------ brand: plan */

  packages() { return this.get<PackageInfo[]>('/campaign-plan/packages'); }
  /** Platforms creators can connect, so only those can be chosen. Falls back to X if the setting cannot be read. */
  async connectablePlatforms(): Promise<string[]> {
    try {
      const v = (await this.get<Record<string, unknown>>('/settings/public'))?.['connectable_platforms'];
      const list = Array.isArray(v) ? v.map((p) => String(p).toLowerCase()) : [];
      return list.length ? list : ['twitter'];
    } catch {
      return ['twitter'];
    }
  }
  createDraft(form: Partial<PlanForm>) { return this.post<PlanSummary>('/campaign-plan', form); }
  updateDraft(id: number, form: Partial<PlanForm>) { return this.patch<PlanSummary>(`/campaign-plan/${id}`, form); }
  review(id: number) { return this.get<PlanSummary>(`/campaign-plan/${id}/review`); }
  submit(id: number) { return this.post<PlanSummary>(`/campaign-plan/${id}/submit`); }
  cancel(id: number, reason?: string) { return this.post<PlanSummary>(`/campaign-plan/${id}/cancel`, { reason }); }
  history(id: number) { return this.get<Transition[]>(`/campaign-plan/${id}/history`); }
  close(id: number) { return this.post<unknown>(`/campaign-plan/${id}/close`); }
  report(id: number) { return this.get<Record<string, any> | null>(`/campaign-plan/${id}/report`); }

  /**
   * Pay for an approved campaign: from the wallet, or by card for the shortfall.
   * The card popup's own "success" is never trusted; the campaign must be seen
   * going live on the server.
   */
  async pay(id: number, onStep?: (s: 'starting' | 'card' | 'confirming') => void): Promise<PayOutcome> {
    onStep?.('starting');
    const res = await this.post<CheckoutResult>(`/campaign-plan/${id}/checkout`);
    if (res.status === 'paid') return 'paid';
    onStep?.('card');
    const card = await this.checkout.openCard(res as any);
    if (card === 'closed') return 'cancelled';
    onStep?.('confirming');
    return (await this.waitUntilActive(id)) ? 'paid' : 'pending';
  }

  private async waitUntilActive(id: number): Promise<boolean> {
    const deadline = Date.now() + this.confirmTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, this.pollEveryMs));
      try {
        if ((await this.review(id)).lifecycle === 'active') return true;
      } catch { /* keep waiting */ }
    }
    return false;
  }

  /* -------------------------------------------------------- brand: creators */

  money(campaignId: number) { return this.get<MyWork['earnings']>(`/collaboration/campaign/${campaignId}/money`); }
  roster(campaignId: number) { return this.get<RosterRow[]>(`/collaboration/campaign/${campaignId}`); }
  matches(campaignId: number) { return this.get<Matches>(`/collaboration/campaign/${campaignId}/matches`); }
  invite(campaignId: number, userId: number, rewardAllocation: number) { return this.post<unknown>('/collaboration/invite', { campaignId, userId, reward_allocation: rewardAllocation }); }
  select(id: number, rewardAllocation: number) { return this.post<unknown>(`/collaboration/${id}/select`, { reward_allocation: rewardAllocation }); }
  notSelected(id: number, reason?: string) { return this.post<unknown>(`/collaboration/${id}/not-selected`, { reason }); }
  cancelOffer(id: number, reason?: string) { return this.post<unknown>(`/collaboration/${id}/cancel-offer`, { reason }); }

  /* ------------------------------------------------------- creator: offers */

  discover(includeIneligible = true) { return this.get<Discover>('/collaboration/discover', { include_ineligible: includeIneligible }); }
  mine() { return this.get<MyCollab[]>('/collaboration/mine'); }
  myWork() { return this.get<MyWork>('/collaboration/mine/summary'); }
  apply(campaignId: number, pitch?: string) { return this.post<unknown>('/collaboration/apply', { campaignId, pitch }); }
  accept(id: number) { return this.post<unknown>(`/collaboration/${id}/accept`); }
  decline(id: number, reason?: string) { return this.post<unknown>(`/collaboration/${id}/decline`, { reason }); }
  withdraw(id: number) { return this.post<unknown>(`/collaboration/${id}/withdraw`); }

  /* ------------------------------------------------- shared: work and money */

  terms(id: number) { return this.get<{ version: number; terms: OfferTerms; accepted_at?: string }[]>(`/collaboration/${id}/terms`); }
  content(id: number) { return this.get<ContentItem[]>(`/collaboration/${id}/content`); }
  contentHistory(itemId: number) { return this.get<WorkflowEvent[]>(`/content/${itemId}/history`); }
  rewards(id: number) { return this.get<RewardsView>(`/collaboration/${id}/rewards`); }
  disputes(id: number) { return this.get<Dispute[]>(`/collaboration/${id}/disputes`); }
  stop(id: number, reason?: string) { return this.post<{ stage: string; paidToCreator: number; returnedToBrand: number }>(`/collaboration/${id}/stop`, { reason }); }

  submitDraft(itemId: number, url: string, note?: string) { return this.post<unknown>(`/content/${itemId}/draft`, { url, note }); }
  publish(itemId: number, url: string, screenshot_url?: string, note?: string) { return this.post<unknown>(`/content/${itemId}/publish`, { url, screenshot_url, note }); }
  approve(itemId: number) { return this.post<unknown>(`/content/${itemId}/approve`); }
  requestRevision(itemId: number, note: string) { return this.post<unknown>(`/content/${itemId}/request-revision`, { note }); }
  reject(itemId: number, reason: string) { return this.post<unknown>(`/content/${itemId}/reject`, { reason }); }
  submitMetrics(itemId: number, m: MetricInput) { return this.post<unknown>(`/content/${itemId}/metrics`, m); }
  openDispute(body: { itemId?: number; rewardId?: number; reason: string; url?: string }) { return this.post<unknown>('/dispute', body); }
  addDisputeEvidence(id: number, note: string, url?: string) { return this.post<unknown>(`/dispute/${id}/evidence`, { note, url }); }
}

export type { CollabState };
