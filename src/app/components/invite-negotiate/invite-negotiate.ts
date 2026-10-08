import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, EMPTY, of, Subject } from 'rxjs';
import { debounceTime, filter, switchMap, takeUntil } from 'rxjs/operators';
import { RealtimeEvent, SocketService } from '../../socket.service';
import { Negotiation } from '../negotiation/negotiation';
import { CampaignDeliverableService, CampaignService } from '../../core/api';
import { extractApiList } from '../../core/utils/api-response';
import { formatHumanDate, relativeDay, RelativeDay } from '../../core/utils/human-date';
import { platformLabel } from '../../core/utils/platform-icon';

export interface DeliverableRow {
  label: string;
  quantity: number;
  rate: number;
  dueDate: string;
  dueRelative: RelativeDay | null;
}

@Component({
  selector: 'app-invite-negotiate',
  imports: [CommonModule, Negotiation],
  templateUrl: './invite-negotiate.html',
  styleUrl: './invite-negotiate.scss',
})
export class InviteNegotiate implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private campaignApi = inject(CampaignService);
  private deliverableApi = inject(CampaignDeliverableService);
  private socket = inject(SocketService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  /** This page is always the influencer responding to a brand's invite/offer. */
  readonly viewMode = 'influencer';

  campaign: any = null;
  campaignInfluencerId: number | null = null;
  campaignId: number | null = null;
  isLoading = false;
  loadError: string | null = null;

  /** The campaign's deliverables: the initial terms on offer. */
  deliverables: DeliverableRow[] = [];
  deliverablesLoading = false;
  deliverablesError: string | null = null;

  ngOnInit(): void {
    this.socket
      .changes(RealtimeEvent.CampaignUpdated)
      .pipe(
        filter((c) => c.campaignId != null && c.campaignId === this.campaignId),
        debounceTime(300),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        if (this.campaignId) this.fetchDeliverables(this.campaignId);
      });

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([params, queryParams]) => {
          this.campaignInfluencerId = Number(params.get('id')) || null;
          this.campaignId = Number(queryParams.get('campaignId')) || null;
          this.campaign = null;
          this.loadError = null;
          this.deliverables = [];
          this.deliverablesError = null;
          if (!this.campaignId) {
            this.isLoading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.isLoading = true;
          this.fetchDeliverables(this.campaignId);
          // Catch per request so one failure doesn't kill the route stream.
          return this.campaignApi
            .campaignControllerFindOne(this.campaignId, 'body', false, { transferCache: false })
            .pipe(
              catchError((err) => {
                console.error(err);
                this.loadError = 'Could not load campaign details.';
                return of(null);
              }),
            );
        }),
      )
      .subscribe((res) => {
        if (res) this.campaign = (res as any)?.data ?? res;
        this.isLoading = false;
        // Zoneless: plain fields set in a subscription need an explicit check.
        this.cdr.markForCheck();
      });
  }

  /** Loads the campaign's deliverables from the deliverables service. */
  private fetchDeliverables(campaignId: number): void {
    this.deliverablesLoading = true;
    this.deliverableApi
      .campaignDeliverableControllerFindByCampaign(campaignId, 'body', false, { transferCache: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deliverables = (extractApiList(res) as Record<string, any>[])
            .filter((d) => !!d)
            .map((d) => {
              const quantity = Number(d['quantity'] ?? 0) || 0;
              const due = d['due_date'] ?? d['dueDate'] ?? '';
              return {
                label: `${platformLabel(d['platform'])} ${String(d['content_type'] ?? d['contentType'] ?? 'post')}`,
                quantity,
                rate: Number(d['rate_per_post'] ?? d['ratePerPost'] ?? 0) || 0,
                dueDate: due ? formatHumanDate(due) : '',
                dueRelative: due ? relativeDay(due) : null,
              };
            });
          this.deliverablesLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.deliverablesLoading = false;
          this.deliverablesError = err?.error?.message || err?.message || 'Could not load the deliverables.';
          this.cdr.markForCheck();
        },
      });
  }

  get deliverablesTotal(): number {
    return this.deliverables.reduce((sum, d) => sum + d.quantity * d.rate, 0);
  }

  get deliverablesCount(): number {
    return this.deliverables.reduce((sum, d) => sum + d.quantity, 0);
  }

  /** Campaign platforms arrive as plain names or JSON-encoded lists (`'["instagram"]'`). */
  get platforms(): string[] {
    const raw: unknown = this.campaign?.platforms;
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
    const flat = list.flatMap((p: unknown) => {
      if (typeof p !== 'string') return [];
      try {
        const parsed = JSON.parse(p);
        return Array.isArray(parsed) ? parsed.map(String) : [p];
      } catch {
        return [p];
      }
    });
    return [...new Set(flat.map((p) => platformLabel(p)))];
  }

  get deadline(): string {
    return formatHumanDate(this.campaign?.end_date);
  }

  get deadlineRelative(): RelativeDay | null {
    return relativeDay(this.campaign?.end_date);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/home/invites-and-applications']);
  }
}

