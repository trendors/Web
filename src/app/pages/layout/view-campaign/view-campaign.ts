import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import {
  selectCampaignError,
  selectCampaignList,
  selectCampaignLoading,
} from '../../../store/campaign/campaign.selector';
import { CampaignInfluencerService } from '../../../core/api';
import { Campaign } from '../../../core/models/campaign/campaign.model';
import { environment } from '../../../../environments/environment';
import { extractApiList } from '../../../core/utils/api-response';
import { platformIconKey, platformLabel } from '../../../core/utils/platform-icon';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  Subject,
  takeUntil,
} from 'rxjs';

export interface CampaignCounts {
  total: number;
  active: number;
  done: number;
}

const ACTIVE_STATUSES = ['active', 'contracted'];
const DONE_STATUSES = ['completed'];

@Component({
  selector: 'app-view-campaign',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './view-campaign.html',
  styleUrl: './view-campaign.scss',
})
export class ViewCampaign implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private campaignInfluencerApi = inject(CampaignInfluencerService);
  private destroy$ = new Subject<void>();

  campaigns$ = this.store.select(selectCampaignList);
  isLoading$ = this.store.select(selectCampaignLoading);
  error$ = this.store.select(selectCampaignError);
  filteredCampaigns$ = new Observable<Campaign[]>();
  platformOptions$: Observable<string[]> = of([]);
  activeCount$: Observable<number> = of(0);

  private platformFilter$ = new BehaviorSubject<string>('all');
  private sortDir$ = new BehaviorSubject<'newest' | 'oldest'>('newest');

  counts = signal(new Map<number, CampaignCounts>());
  enrolledTotal = computed(() =>
    [...this.counts().values()].reduce((sum, counts) => sum + counts.total, 0),
  );

  platformFilter = 'all';
  sortDir: 'newest' | 'oldest' = 'newest';
  isPlatformOpen = false;

  readonly iconKey = platformIconKey;
  readonly platformName = platformLabel;

  constructor() {
    this.platformOptions$ = this.campaigns$.pipe(
      map((campaigns) => {
        const seen = new Map<string, string>();
        for (const campaign of campaigns) {
          for (const platform of this.getPlatforms(campaign.platforms)) {
            const key = platform.trim().toLowerCase();
            if (key && !seen.has(key)) seen.set(key, platform);
          }
        }
        return [...seen.keys()].sort();
      }),
    );
    this.activeCount$ = this.campaigns$.pipe(
      map((campaigns) => campaigns.filter((c) => this.isActiveCampaign(c)).length),
    );
    this.filteredCampaigns$ = combineLatest([
      this.campaigns$,
      this.platformFilter$,
      this.sortDir$,
    ]).pipe(
      map(([campaigns, platform, sortDir]) => {
        const wanted = platform.trim().toLowerCase();
        const filtered =
          wanted === 'all'
            ? [...campaigns]
            : campaigns.filter((campaign) =>
                this.getPlatforms(campaign.platforms).some(
                  (p) => p.trim().toLowerCase() === wanted,
                ),
              );
        return filtered.sort((a, b) => {
          const left = new Date(a.createdAt).getTime() || 0;
          const right = new Date(b.createdAt).getTime() || 0;
          return sortDir === 'newest' ? right - left : left - right;
        });
      }),
    );
  }

  ngOnInit() {
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user?.id) {
          this.store.dispatch(CampaignActions.loadCampaigns({ userId: user.id }));
        }
      });

    // Per-campaign influencer counts load independently: the list renders
    // immediately and counts fill in on arrival (failures stay at zero).
    this.campaigns$.pipe(takeUntil(this.destroy$)).subscribe((campaigns) => {
      if (campaigns.length === 0) return;
      forkJoin(
        campaigns.map((campaign) =>
          this.campaignInfluencerApi
            .campaignInfluencerControllerFindByCampaign(campaign.id, false, 'body', false, {
              transferCache: false,
            })
            .pipe(
              map((res) => ({ id: campaign.id, rows: extractApiList(res) as any[] })),
              catchError(() => of({ id: campaign.id, rows: [] as any[] })),
            ),
        ),
      ).subscribe((results) => {
        const next = new Map<number, CampaignCounts>();
        for (const { id, rows } of results) {
          const statuses = rows.map((row) => String(row?.status ?? '').trim().toLowerCase());
          next.set(id, {
            total: rows.length,
            active: statuses.filter((s) => ACTIVE_STATUSES.includes(s)).length,
            done: statuses.filter((s) => DONE_STATUSES.includes(s)).length,
          });
        }
        this.counts.set(next);
      });
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setPlatform(value: string): void {
    this.platformFilter = value;
    this.platformFilter$.next(value);
    this.isPlatformOpen = false;
  }

  togglePlatformDropdown(): void {
    this.isPlatformOpen = !this.isPlatformOpen;
  }

  toggleSort(): void {
    this.sortDir = this.sortDir === 'newest' ? 'oldest' : 'newest';
    this.sortDir$.next(this.sortDir);
  }

  countsFor(campaignId: number): CampaignCounts {
    return this.counts().get(campaignId) ?? { total: 0, active: 0, done: 0 };
  }

  isActiveCampaign(campaign: Campaign): boolean {
    return campaign.access === 'open' || campaign.access === 'invite_only';
  }

  getPlatforms(raw: unknown): string[] {
    const list = Array.isArray(raw) ? raw : [];
    const out: string[] = [];
    for (const value of list) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            for (const entry of parsed) {
              if (typeof entry === 'string' && entry.trim()) out.push(entry.trim());
            }
            continue;
          }
          if (typeof parsed === 'string' && parsed.trim()) {
            out.push(parsed.trim());
            continue;
          }
        } catch {
          // not JSON, fall through
        }
      }
      out.push(trimmed);
    }
    return out;
  }

  formatDateRange(campaign: Campaign): string {
    const start = campaign.start_date ? new Date(campaign.start_date) : null;
    const end = campaign.end_date ? new Date(campaign.end_date) : null;
    const valid = (d: Date | null) => d instanceof Date && !Number.isNaN(d.getTime());
    const fmt = (d: Date, withYear: boolean) =>
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(withYear ? { year: 'numeric' } : {}),
      });
    if (valid(start) && valid(end)) return `${fmt(start!, false)} – ${fmt(end!, true)}`;
    if (valid(start)) return `From ${fmt(start!, true)}`;
    if (valid(end)) return `Until ${fmt(end!, true)}`;
    return 'No dates set';
  }

  campaignImage(campaign: Campaign): string | null {
    const files = this.normalizeFiles((campaign as any)?.files);
    for (const file of files) {
      const url = this.resolveFileUrl(file);
      if (url) return url;
    }
    return null;
  }

  onThumbError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) img.style.display = 'none';
  }

  private normalizeFiles(files: unknown): string[] {
    if (!files) return [];
    const out: string[] = [];
    const pushValue = (v: unknown): void => {
      if (v == null) return;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              parsed.forEach(pushValue);
              return;
            }
            if (typeof parsed === 'string') {
              pushValue(parsed);
              return;
            }
          } catch {
            // not JSON, fall through
          }
        }
        out.push(trimmed);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach(pushValue);
        return;
      }
      if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        const candidate = obj['url'] ?? obj['src'] ?? obj['path'] ?? obj['fileUrl'] ?? obj['location'];
        if (typeof candidate === 'string') {
          pushValue(candidate);
          return;
        }
      }
    };
    pushValue(files);
    return out;
  }

  private resolveFileUrl(file: string): string {
    const trimmed = (file ?? '').trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    const base = (environment.apiUrl ?? '').replace(/\/+$/, '');
    const path = trimmed.replace(/^\.?\//, '');
    return base ? `${base}/${path}` : `/${path}`;
  }

  openModal(campaign: Campaign): void {
    this.router.navigate(['/home/view-campaign', campaign.id]);
  }

  trackById(_i: number, campaign: Campaign) {
    return campaign.id;
  }
}
