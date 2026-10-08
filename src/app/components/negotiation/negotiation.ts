import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, filter } from 'rxjs';
import { RealtimeEvent, SocketService } from '../../socket.service';
import { CommonModule } from '@angular/common';
import {
  CampaignDeliverableService,
  CampaignInfluencerService,
  CampaignOfferService,
  UpdateCampaignInfluencerDto,
} from '../../core/api';
import type { CampaignOffer, CreateCampaignOfferDto } from '../../core/api';
import { extractApiList } from '../../core/utils/api-response';

export interface NegotiationOfferItem {
  /** Null for chore lines ("attend the shoot"), which carry a title instead. */
  contentType: string | null;
  platform: string | null;
  quantity: number;
  ratePerPost: number;
  title?: string;
  description?: string;
  /** YYYY-MM-DD, carried over so a counter on one line leaves the others' dates alone. */
  dueDate?: string;
}

@Component({
  selector: 'app-negotiation',
  imports: [CommonModule],
  templateUrl: './negotiation.html',
  styleUrl: './negotiation.scss',
})
export class Negotiation implements OnInit, OnChanges {
  private offerApi = inject(CampaignOfferService);
  private deliverableApi = inject(CampaignDeliverableService);
  private assignmentApi = inject(CampaignInfluencerService);
  private cdr = inject(ChangeDetectorRef);
  private socket = inject(SocketService);
  private destroyRef = inject(DestroyRef);

  /** Display values fed by the hosting page; the counter form + history below stay static until wired. */
  @Input() influencerName = '';
  @Input() dealStatus = 'Waiting on client';
  @Input() offerAmount = 0;
  @Input() contentsCount = 0;
  @Input() brandName = '';
  @Input() viewMode = 'influencer';
  @Input() offerItems: NegotiationOfferItem[] = [];
  /** Campaign whose deliverables are the current offer (SDK fetch). */
  @Input() campaignId: number | null = null;
  @Input() influencerId: number | null = null;
  /** Assignment the negotiation thread belongs to. */
  @Input() campaignInfluencerId: number | null = null;

  @Input() lastOfferBy: 'brand' | 'influencer' = 'brand';
  @Input() history: { by: string; action: string; amount: number }[] = [];

  showCounter = false;
  counterAmount = 0;
  counterCount = 0;
  counterDays = 14;
  counterNote = '';
  actionLoading = false;
  actionError: string | null = null;
  /** Neutral outcome message (e.g. waiting for the other side). */
  actionNotice: string | null = null;
  /** Offer row the counter form is targeting; the rest of the offer carries over unchanged. */
  counterTarget: NegotiationOfferItem | null = null;
  counterIndex: number | null = null;

  /** Live deliverables for the campaign — fallback offer when there's no negotiation thread yet. */
  deliverables: NegotiationOfferItem[] = [];
  deliverablesLoading = false;
  deliverablesError: string | null = null;

  /** Agreed deliverables for this assignment (GET /campaign-offer/assignment/{id}/agreed). */
  agreedOffer: CampaignOffer | null = null;
  agreedLoading = false;
  agreedError: string | null = null;

  /** Negotiation thread for the assignment, newest round first. */
  offers: CampaignOffer[] = [];
  offersLoading = false;
  offersError: string | null = null;

  /** The server's reason when it sent one; Angular's generic "Http failure response…" otherwise. */
  private errMsg(err: any, fallback: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join(', ');
    return m || err?.message || fallback;
  }

  ngOnInit(): void {
    this.fetchDeliverables();
    this.fetchThread();
    this.fetchAgreed();

    // The other side moved (offer, counter, accept, decline): refresh live.
    this.socket
      .changes(RealtimeEvent.NegotiationUpdated, RealtimeEvent.AssignmentUpdated)
      .pipe(
        filter((c) => c.assignmentId != null && c.assignmentId === this.campaignInfluencerId),
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.fetchThread();
        this.fetchAgreed();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['campaignId'] && !changes['campaignId'].firstChange) {
      this.fetchDeliverables();
    }
    if (changes['campaignInfluencerId'] && !changes['campaignInfluencerId'].firstChange) {
      this.fetchThread();
      this.fetchAgreed();
    }
  }

  /** Loads the campaign's deliverables: the brand's baseline offer before any negotiation round exists. */
  fetchDeliverables(): void {
    const campaignId = this.campaignId;
    if (!campaignId) return;

    this.deliverablesLoading = true;
    this.deliverablesError = null;

    this.deliverableApi
      .campaignDeliverableControllerFindByCampaign(campaignId, 'body', false, { transferCache: false })
      .subscribe({
        next: (res: any) => {
          this.deliverablesLoading = false;
          this.deliverables = (extractApiList(res) as Record<string, any>[])
            .filter((d) => !!d)
            .map((d) => ({
              contentType: String(d['content_type'] ?? d['contentType'] ?? 'post'),
              platform: String(d['platform'] ?? '—'),
              quantity: Number(d['quantity'] ?? 0) || 0,
              ratePerPost: Number(d['rate_per_post'] ?? d['ratePerPost'] ?? d['rate'] ?? 0) || 0,
            }));
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.deliverablesLoading = false;
          this.deliverablesError = this.errMsg(err, 'Failed to load deliverables');
          this.cdr.markForCheck();
        },
      });
  }

  /** Loads the negotiation thread (counter-offer rounds) for this assignment. */
  fetchThread(): void {
    if (!this.campaignInfluencerId) return;

    this.offersLoading = true;
    this.offersError = null;

    this.offerApi.campaignOfferControllerThread(this.campaignInfluencerId, 'body', false, { transferCache: false }).subscribe({
      next: (res) => {
        this.offersLoading = false;
        try {
          const list = (extractApiList(res) as CampaignOffer[]).filter((o) => !!o);
          // newest round first
          this.offers = [...list].sort((a, b) => (b.round ?? 0) - (a.round ?? 0));
        } catch (err) {
          console.error('Failed to parse negotiation thread response', err);
          this.offersError = 'Failed to load negotiation thread';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.offersLoading = false;
        this.offersError = this.errMsg(err, 'Failed to load negotiation thread');
        this.cdr.markForCheck();
      },
    });
  }

  get latestOffer(): CampaignOffer | null {
    return this.offers[0] ?? null;
  }

  /** Loads the agreed deliverables for this assignment — the current offer. */
  fetchAgreed(): void {
    if (!this.campaignInfluencerId) return;

    this.agreedLoading = true;
    this.agreedError = null;

    this.offerApi.campaignOfferControllerAgreed(this.campaignInfluencerId, 'body', false, { transferCache: false }).subscribe({
      next: (res) => {
        this.agreedLoading = false;
        try {
          const data = (res as any)?.data ?? res;
          const offer = (Array.isArray(data) ? data[0] : data) as CampaignOffer | null;
          this.agreedOffer = offer != null && typeof offer === 'object' ? offer : null;
        } catch (err) {
          console.error('Failed to parse agreed offer response', err);
          this.agreedError = 'Failed to load agreed offer';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.agreedLoading = false;
        this.agreedError = this.errMsg(err, 'Failed to load agreed offer');
        this.cdr.markForCheck();
      },
    });
  }

  /** Offer line -> card row (offer lines carry `rate`, deliverables `rate_per_post`). */
  private lineToItem(l: Record<string, any>): NegotiationOfferItem {
    const item: NegotiationOfferItem = {
      contentType: l['content_type'] ?? null,
      platform: l['platform'] ?? null,
      quantity: Number(l['quantity'] ?? 0) || 0,
      ratePerPost: Number(l['rate'] ?? l['rate_per_post'] ?? 0) || 0,
    };
    if (l['title']) item.title = String(l['title']);
    if (l['description']) item.description = String(l['description']);
    if (l['due_date']) item.dueDate = String(l['due_date']).slice(0, 10);
    return item;
  }

  /** Agreed lines as card rows. */
  get agreedItems(): NegotiationOfferItem[] {
    return (this.agreedOffer?.lines ?? []).map((l) => this.lineToItem(l as Record<string, any>));
  }

  isChore(item: NegotiationOfferItem): boolean {
    return !item.contentType;
  }

  itemLabel(item: NegotiationOfferItem): string {
    if (this.isChore(item)) {
      const name = item.title || 'Custom work';
      return item.quantity > 1 ? `${item.quantity} × ${name}` : name;
    }
    return `${item.quantity} × ${item.platform} ${item.contentType}`;
  }

  itemRateText(item: NegotiationOfferItem): string {
    if (!(item.ratePerPost > 0)) return '—';
    const flat = this.isChore(item) && item.quantity === 1;
    return `₦${item.ratePerPost.toLocaleString('en-US')}${flat ? '' : ' each'}`;
  }

  /** True while showing the agreed deliverables for this assignment. */
  get isAgreedOffer(): boolean { return this.agreedItems.length > 0; }

  /** Who proposed last: the latest real offer wins over the static input. */
  get effectiveLastOfferBy(): 'brand' | 'influencer' {
    return (this.latestOffer?.proposed_by as 'brand' | 'influencer') ?? this.lastOfferBy;
  }

  /** Deal status label: the latest real offer wins over the static input. */
  get effectiveDealStatus(): string {
    const status = this.latestOffer?.status;
    if (!status) return this.dealStatus;
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /** A round only takes responses while it is still proposed; once accepted, declined or expired the thread is closed. */
  get isOpen(): boolean {
    const status = this.latestOffer?.status;
    return !status || status === 'proposed';
  }
  get isMyTurn() { return this.isOpen && this.effectiveLastOfferBy !== this.viewMode; }
  get isWaiting() { return this.isOpen && !this.isMyTurn; }
  get closedMessage(): string | null {
    if (this.isOpen) return null;
    switch (this.latestOffer?.status) {
      case 'accepted': return 'This offer was accepted — the deal is agreed.';
      case 'declined': return 'This offer was declined.';
      case 'expired': return 'This offer expired.';
      default: return 'This negotiation is closed.';
    }
  }
  get otherPartyName() { return this.viewMode === 'brand' ? (this.influencerName || 'the influencer') : (this.brandName || 'the brand'); }
  get offerLabel() {
    if (!this.isOpen) return this.isAgreedOffer ? 'Agreed offer' : 'Last offer';
    return this.isMyTurn ? `${this.otherPartyName}'s offer` : 'Your offer';
  }
  /** True while showing the campaign's deliverables (no agreed deal or counter-offer round exists yet). */
  get isOfficialOffer(): boolean { return !this.isAgreedOffer && !this.latestOffer && this.deliverables.length > 0; }
  /** Per-unit rate to the cent (the API stores 2 decimals). */
  get costPerContent() { return this.counterCount > 0 ? Math.round((this.counterAmount / this.counterCount) * 100) / 100 : 0; }
  /** What the counter really totals once the per-unit rate is rounded to the cent. */
  get counterTotalSent() { return Math.round(this.costPerContent * this.counterCount * 100) / 100; }
  get statusClass() { return { 'status-accepted': this.effectiveDealStatus === 'Accepted', 'status-declined': this.effectiveDealStatus === 'Declined' }; }

  /** Card rows: agreed deliverables win, then latest offer, then live deliverables, then input items. */
  get currentItems(): NegotiationOfferItem[] {
    if (this.agreedItems.length > 0) return this.agreedItems;
    const offerLines = this.latestOffer?.lines ?? [];
    if (offerLines.length > 0) {
      return offerLines.map((l) => this.lineToItem(l as Record<string, any>));
    }
    return this.deliverables.length > 0 ? this.deliverables : this.offerItems;
  }

  get currentTotal(): number {
    return this.currentItems.reduce((sum, item) => sum + item.quantity * (item.ratePerPost || 0), 0);
  }

  get currentCount(): number {
    return this.currentItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  /** Current-offer card values: latest offer/deliverables when loaded, inputs otherwise. */
  get displayAmount(): number {
    return this.currentItems.length > 0 ? this.currentTotal : this.offerAmount;
  }

  get displayCount(): number {
    return this.currentItems.length > 0 ? this.currentCount : this.contentsCount;
  }

  /** Offer history for the timeline, newest first. */
  get offerHistory(): { by: string; action: string; amount: number }[] {
    if (this.offers.length === 0) return this.history;
    return this.offers.map((o) => ({
      by: o.proposed_by ?? 'brand',
      action: o.status ?? 'proposed',
      amount: (o.lines ?? []).reduce((sum, l) => sum + (l.quantity ?? 0) * (l.rate ?? 0), 0),
    }));
  }

  /** Opens the counter form pre-filled with one line's current terms. */
  startCounter(item: NegotiationOfferItem, index: number): void {
    this.counterTarget = item;
    this.counterIndex = index;
    this.counterCount = item.quantity;
    this.counterAmount = item.quantity * (item.ratePerPost || 0);
    this.counterDays = 14;
    this.counterNote = '';
    this.actionError = null;
    this.showCounter = true;
  }

  /** The main Counter button: starts on the first line; the form lets you pick another. */
  openCounter(): void {
    const items = this.currentItems;
    if (items.length > 0) {
      this.startCounter(items[0], 0);
    } else {
      this.actionError = 'There are no terms to counter yet.';
    }
  }

  selectCounterLine(index: number): void {
    const item = this.currentItems[index];
    if (item) this.startCounter(item, index);
  }

  cancelCounter(): void {
    this.showCounter = false;
    this.counterTarget = null;
    this.counterIndex = null;
  }

  accept(): void {
    const offer = this.latestOffer;
    if (offer?.id) {
      this.respondToOffer(offer.id, 'accepted');
      return;
    }
    this.recordOfficialOfferThen('accepted');
  }

  decline(): void {
    const offer = this.latestOffer;
    if (offer?.id) {
      this.respondToOffer(offer.id, 'declined');
      return;
    }
    this.recordOfficialOfferThen('declined');
  }

  private respondToOffer(offerId: number, status: 'accepted' | 'declined'): void {
    this.actionLoading = true;
    this.actionError = null;
    this.offerApi.campaignOfferControllerRespond(offerId, { status }).subscribe({
      next: () => { this.actionLoading = false; this.fetchThread(); this.fetchAgreed(); },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = this.errMsg(err, `Could not ${status === 'accepted' ? 'accept' : 'decline'} offer`);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * No round yet: the campaign's deliverables are the opening terms. The
   * influencer accepting them closes the deal outright (the server builds the
   * terms from the campaign, so nobody has to confirm); declining closes out
   * the assignment, since there is no round to decline.
   */
  private recordOfficialOfferThen(status: 'accepted' | 'declined'): void {
    const id = this.campaignInfluencerId;
    if (!id) return;

    if (status === 'accepted' && this.viewMode !== 'influencer') {
      this.actionError = "These are the campaign's own terms — the influencer accepts them.";
      return;
    }

    this.actionLoading = true;
    this.actionError = null;
    this.actionNotice = null;

    if (status === 'accepted') {
      this.offerApi.campaignOfferControllerAcceptTerms(id).subscribe({
        next: () => {
          this.actionLoading = false;
          this.actionNotice = 'You accepted the campaign terms. The deal is agreed.';
          this.fetchThread();
          this.fetchAgreed();
        },
        error: (err) => {
          this.actionLoading = false;
          this.actionError = this.errMsg(err, 'Could not accept the campaign terms');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    const next = this.viewMode === 'brand'
      ? UpdateCampaignInfluencerDto.StatusEnum.Rejected
      : UpdateCampaignInfluencerDto.StatusEnum.Withdrawn;
    this.assignmentApi.campaignInfluencerControllerUpdate(id, { status: next }).subscribe({
      next: () => {
        this.actionLoading = false;
        this.actionNotice = 'You declined this offer.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = this.errMsg(err, 'Could not decline the offer');
        this.cdr.markForCheck();
      },
    });
  }

  submitCounter(): void {
    const id = this.campaignInfluencerId;
    if (!id) return;
    if (!(this.counterAmount > 0) || !(this.counterCount > 0)) {
      this.actionError = 'Enter a total amount and a number of contents greater than zero.';
      return;
    }
    const items = this.currentItems;
    const index = this.counterIndex;
    if (index === null || index >= items.length) {
      this.actionError = 'There are no terms to counter yet.';
      return;
    }

    const dueDate = new Date(Date.now() + this.counterDays * 86400000).toISOString().slice(0, 10);
    // Content lines let the server regenerate the title from the new quantity;
    // chore lines have no other identity, so theirs travels with them.
    const toLine = (item: NegotiationOfferItem, quantity: number, rate: number, due?: string) => ({
      ...(item.contentType
        ? { content_type: item.contentType as any, platform: (item.platform ?? undefined) as any }
        : { title: item.title || 'Custom work' }),
      ...(item.description ? { description: item.description } : {}),
      quantity,
      rate,
      ...(due ? { due_date: due } : {}),
    });
    // A counter changes one line; every other line carries over untouched.
    const lines = items.map((item, i) =>
      i === index
        ? toLine(item, this.counterCount, this.costPerContent, dueDate)
        : toLine(item, item.quantity, item.ratePerPost, item.dueDate),
    );
    const dto: CreateCampaignOfferDto = {
      campaignInfluencerId: id,
      proposed_by: this.viewMode === 'brand' ? 'brand' : 'influencer',
      message: this.counterNote || undefined,
      lines,
    };
    this.actionLoading = true;
    this.actionError = null;
    this.actionNotice = null;
    this.offerApi.campaignOfferControllerCreate(dto).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showCounter = false;
        this.counterTarget = null;
        this.counterIndex = null;
        this.counterAmount = 0;
        this.counterCount = 0;
        this.counterNote = '';
        this.fetchThread();
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = this.errMsg(err, 'Could not send counter offer');
        this.cdr.markForCheck();
      },
    });
  }
}
