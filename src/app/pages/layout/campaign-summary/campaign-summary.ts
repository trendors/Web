import { DatePipe, AsyncPipe, NgSwitchDefault, NgSwitch, NgSwitchCase, CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, map, Observable, of, Subject, switchMap, take, takeUntil, tap, timeout } from 'rxjs';
import { Campaign } from '../../../core/models/campaign/campaign.model';
import { selectCampaignList, selectCampaignLoading } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { environment } from '../../../../environments/environment';
import { CampaignInfluencerPostService, CampaignInfluencerService } from '../../../core/api';
import { extractApiList } from '../../../core/utils/api-response';
import { userDisplayName } from '../../../core/utils/user-display';
import type { CampaignInfluencer } from '../../../core/api/model/campaignInfluencer';
import type { CampaignInfluencerPost } from '../../../core/api/model/campaignInfluencerPost';
import { EscrowProgress, EscrowStage } from '../../../components/escrow-progress/escrow-progress';
import { Negotiation } from "../../../components/negotiation/negotiation";

export interface Applicant {
  id: number;
  name: string;
  followerCount: number;
  tier: string;
  socialMedia: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface InfluencerPostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  recorded_at?: string;
}

export interface InfluencerPostRow {
  id: number | null;
  title: string;
  contentType: string;
  platform: string;
  postUrl: string;
  publishedAt: string;
  status: string;
  statusClass: string;
  payoutAmount: number;
  paymentStatus: string;
  thumbnailUrl: string;
  snapshots: number;
  latest: InfluencerPostMetrics | null;
  engagement: number;
}

export interface CampaignInfluencerRow {
  assignmentId: number | null;
  influencerId: number | null;
  name: string;
  handle: string;
  avatar: string;
  platform: string;
  status: string;
  statusClass: string;
  done: number;
  total: number;
  posts: InfluencerPostRow[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

@Component({
  selector: 'app-campaign-summary',
  imports: [DatePipe, AsyncPipe, EscrowProgress, Negotiation, NgSwitch,
    NgSwitchCase, CommonModule, FormsModule,
    NgSwitchDefault],
  templateUrl: './campaign-summary.html',
  styleUrl: './campaign-summary.scss',
})
export class CampaignSummary implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private location = inject(Location);
  private campaignInfluencerApi = inject(CampaignInfluencerService);
  private influencerPostApi = inject(CampaignInfluencerPostService);
  private destroy$ = new Subject<void>();

  isLoading$ = this.store.select(selectCampaignLoading);

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // Ensure the list is loaded so direct navigation / refresh still resolves the campaign.
    this.store
      .select(selectCampaignList)
      .pipe(take(1))
      .subscribe((list) => {
        if (list.length === 0) {
          this.store
            .select(selectCurrentUser)
            .pipe(take(1))
            .subscribe((user) => {
              if (user?.id) {
                this.store.dispatch(CampaignActions.loadCampaigns({ userId: user.id }));
              }
            });
        }
      });

    // Live roster for this campaign via GET /campaign-influencer/campaign/{campaignId}
    // with `withPosts` populating influencerPosts (+ metrics). The roster renders
    // on its own: posts from GET /campaign-influencer-post/campaign/{campaignId}
    // merge in whenever they arrive, so a slow posts request can never hold the
    // whole tab on "Loading…".
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.influencersLoading.set(true);
          this.influencersError.set(null);
        }),
        switchMap((campaignId) => {
          if (!Number.isFinite(campaignId) || campaignId <= 0) return of(null);
          this.loadPostsForCampaign(campaignId);
          return this.rosterForCampaign(campaignId).pipe(
            timeout(25000),
            catchError((err) => {
              this.influencersError.set(err?.message || 'Failed to load influencers');
              return of(null);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((roster) => {
        this.influencersLoading.set(false);
        if (roster == null) {
          if (!this.influencersError()) this.rawRoster = [];
          this.refreshRows();
          return;
        }
        this.rawRoster = roster;
        this.refreshRows();
      });
  }

  /** Posts load independently of the roster and merge into rendered rows on arrival. */
  private loadPostsForCampaign(campaignId: number): void {
    this.influencerPostApi
      .campaignInfluencerPostControllerFindByCampaign(campaignId)
      .pipe(
        map((res) => this.groupPostsByAssignment(this.normalizePosts(res))),
        takeUntil(this.destroy$),
        catchError(() => of(new Map<number, CampaignInfluencerPost[]>())),
      )
      .subscribe((grouped) => {
        this.postsByAssignment = grouped;
        if (this.rawRoster.length > 0) this.refreshRows();
      });
  }

  private rawRoster: CampaignInfluencer[] = [];
  private postsByAssignment = new Map<number, CampaignInfluencerPost[]>();
  private statusOverrides = new Map<number, { status: string; statusClass: string }>();

  /** Rebuild rendered rows from raw data + fetched posts + local status overrides. */
  private refreshRows(): void {
    this.influencers.set(
      this.rawRoster.map((raw) => {
        const row = this.toInfluencerRow(this.withPopulatedPosts(raw, this.postsByAssignment));
        const rawId = (raw as Record<string, unknown>)['id'];
        const userId = ((raw as Record<string, unknown>)['influencer'] as Record<string, unknown> | undefined)?.['id'];
        const override =
          (typeof rawId === 'number' ? this.statusOverrides.get(rawId) : undefined) ??
          (typeof userId === 'number' ? this.statusOverrides.get(userId) : undefined);
        return override ? { ...row, ...override } : row;
      }),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  data$: Observable<Campaign | undefined> = this.route.paramMap.pipe(
    map((params) => Number(params.get('id'))),
    switchMap((id) =>
      this.store.select(selectCampaignList).pipe(map((campaigns) => campaigns.find((c) => c.id === id))),
    ),
  );

  // Hardcoded placeholder applicants until real applicant data is wired up.
  applicants: Applicant[] = [
    { id: 1, name: 'Ada Okafor', followerCount: 4200, tier: 'Nano', socialMedia: 'Instagram', status: 'pending' },
    { id: 2, name: 'Chidi Umeh', followerCount: 18500, tier: 'Micro', socialMedia: 'TikTok', status: 'pending' },
    { id: 3, name: 'Fatima Bello', followerCount: 75000, tier: 'Mid', socialMedia: 'X (Twitter)', status: 'accepted' },
    { id: 4, name: 'Emeka Nwosu', followerCount: 250000, tier: 'Macro', socialMedia: 'YouTube', status: 'pending' },
    { id: 5, name: 'Zainab Yusuf', followerCount: 9800, tier: 'Nano', socialMedia: 'Instagram', status: 'declined' },
  ];

  // Active tab for switching between Influencers and Invites & Applications
  activeTab: 'influencers' | 'invites' = 'influencers';

  // Filter dropdown state (signals: read inside computed lists + template).
  isFilterOpen = false;
  selectedFilter = signal('All Statuses');
  isPendingFilterOpen = false;
  pendingFilter = signal('All Statuses');
  inviteSearch = signal('');

  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  selectFilter(filter: string): void {
    this.selectedFilter.set(filter);
    this.isFilterOpen = false;
  }

  togglePendingFilter(): void {
    this.isPendingFilterOpen = !this.isPendingFilterOpen;
  }

  selectPendingFilter(filter: string): void {
    this.pendingFilter.set(filter);
    this.isPendingFilterOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.isFilterOpen = false;
      this.isPendingFilterOpen = false;
    }
  }

  // Live roster from GET /campaign-influencer/campaign/{campaignId} (signals so the
  // zoneless view updates as soon as the data lands, without waiting for a tab click).
  influencers = signal<CampaignInfluencerRow[]>([]);
  influencersLoading = signal(false);
  influencersError = signal<string | null>(null);
  influencerSearch = signal('');

  private static readonly PENDING_STATUSES = ['invited', 'applied'];

  /** First tab: everything already on the campaign. Anything that is not
   * pending (including unexpected status values) lands here so rows never
   * silently disappear from both tabs. */
  readonly rosterInfluencers = computed(() =>
    this.influencers().filter(
      (inf) => !CampaignSummary.PENDING_STATUSES.includes(inf.status.trim().toLowerCase()),
    ),
  );

  /** Second tab: pending pipeline (invited/applied). */
  readonly pendingInfluencers = computed(() =>
    this.influencers().filter((inf) =>
      CampaignSummary.PENDING_STATUSES.includes(inf.status.trim().toLowerCase()),
    ),
  );

  readonly filteredInfluencers = computed(() => {
    const q = this.influencerSearch().trim().toLowerCase();
    return this.rosterInfluencers().filter((inf) => {
      const matchesSearch =
        !q || inf.name.toLowerCase().includes(q) || inf.handle.toLowerCase().includes(q);
      return matchesSearch && this.matchesStatusFilter(inf.status);
    });
  });

  readonly filteredPending = computed(() => {
    const q = this.inviteSearch().trim().toLowerCase();
    return this.pendingInfluencers().filter((inf) => {
      const matchesSearch =
        !q || inf.name.toLowerCase().includes(q) || inf.handle.toLowerCase().includes(q);
      return matchesSearch && this.matchesPendingFilter(inf.status);
    });
  });

  readonly influencerStats = computed(() => {
    const list = this.influencers();
    const norm = (s: string) => s.trim().toLowerCase();
    return {
      total: list.length,
      active: list.filter((i) => ['active', 'contracted'].includes(norm(i.status))).length,
      completed: list.filter((i) => norm(i.status) === 'completed').length,
      cancelled: list.filter((i) => norm(i.status) === 'cancelled').length,
    };
  });

  private matchesStatusFilter(status: string): boolean {
    const selected = (this.selectedFilter() ?? '').trim().toLowerCase();
    if (!selected || selected === 'all statuses' || selected === 'all') return true;
    const actual = status.trim().toLowerCase();
    if (actual === selected) return true;
    // Back-compat with the previous placeholder filter labels.
    if (selected === 'pending' && actual === 'invited') return true;
    if (selected === 'accepted' && ['contracted', 'active'].includes(actual)) return true;
    if (selected === 'declined' && actual === 'cancelled') return true;
    return false;
  }

  private matchesPendingFilter(status: string): boolean {
    const selected = (this.pendingFilter() ?? '').trim().toLowerCase();
    if (!selected || selected === 'all statuses' || selected === 'all') return true;
    return status.trim().toLowerCase() === selected;
  }

  private normalizeRoster(res: unknown): CampaignInfluencer[] {
    return extractApiList(res) as CampaignInfluencer[];
  }

  /** Roster preferring populated posts, falling back to a plain roster when the
   * `withPosts` option fails server-side (posts endpoint backfills below). */
  private rosterForCampaign(campaignId: number): Observable<CampaignInfluencer[]> {
    const fetch = (withPosts?: boolean) =>
      this.campaignInfluencerApi
        .campaignInfluencerControllerFindByCampaign(campaignId, withPosts)
        .pipe(map((res) => this.normalizeRoster(res)));
    return fetch(true).pipe(
      catchError(() => fetch(undefined)),
      takeUntil(this.destroy$),
    );
  }

  private normalizePosts(res: unknown): CampaignInfluencerPost[] {
    return extractApiList(res) as CampaignInfluencerPost[];
  }

  private assignmentIdOfPost(post: CampaignInfluencerPost): number | null {
    const p = (post ?? {}) as Record<string, any>;
    const ref = p['campaignInfluencer'];
    const id =
      (ref != null && typeof ref === 'object' ? ref['id'] : ref) ??
      p['campaignInfluencerId'] ??
      p['campaign_influencer_id'] ??
      p['assignmentId'];
    return typeof id === 'number' ? id : null;
  }

  private groupPostsByAssignment(posts: CampaignInfluencerPost[]): Map<number, CampaignInfluencerPost[]> {
    const grouped = new Map<number, CampaignInfluencerPost[]>();
    for (const post of posts) {
      const assignmentId = this.assignmentIdOfPost(post);
      if (assignmentId == null) continue;
      const list = grouped.get(assignmentId) ?? [];
      list.push(post);
      grouped.set(assignmentId, list);
    }
    return grouped;
  }

  /**
   * Merge roster-embedded posts with posts fetched from the posts endpoint so
   * metrics render even when the roster omits nested relations. Fetched posts
   * win on conflicts; embedded metrics are kept when the fetched copy has none.
   */
  private withPopulatedPosts(
    row: CampaignInfluencer,
    postsByAssignment: Map<number, CampaignInfluencerPost[]>,
  ): CampaignInfluencer {
    if (typeof row?.id !== 'number') return row;
    const embedded = Array.isArray((row as any)?.influencerPosts)
      ? (row as any).influencerPosts
      : [];
    const fetched = postsByAssignment.get(row.id) ?? [];
    if (fetched.length === 0) return row;
    const merged = new Map<string, CampaignInfluencerPost>();
    const keyOf = (p: CampaignInfluencerPost, index: number) =>
      typeof (p as any)?.id === 'number' ? `id:${(p as any).id}` : `idx:${index}`;
    embedded.forEach((p: CampaignInfluencerPost, index: number) => merged.set(keyOf(p, index), p));
    fetched.forEach((p: CampaignInfluencerPost, index: number) => {
      const key = keyOf(p, index + embedded.length);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, p);
        return;
      }
      const existingMetrics = Array.isArray((existing as any)?.metrics)
        ? (existing as any).metrics
        : [];
      const fetchedMetrics = Array.isArray((p as any)?.metrics) ? (p as any).metrics : [];
      merged.set(key, {
        ...existing,
        ...p,
        metrics: fetchedMetrics.length > 0 ? fetchedMetrics : existingMetrics,
      } as CampaignInfluencerPost);
    });
    return { ...row, influencerPosts: [...merged.values()] };
  }

  private toInfluencerRow(row: CampaignInfluencer): CampaignInfluencerRow {
    const user = (row?.influencer ?? {}) as Record<string, any>;
    const display = userDisplayName(user);
    const name = display === 'User' ? 'Unknown creator' : display;
    const userName = user['user_name'] ?? user['userName'] ?? user['trendors_id'] ?? user['trendorsId'] ?? '';
    const handle =
      (user['instagram_handle'] && `@${String(user['instagram_handle']).replace(/^@/, '')}`) ||
      (user['twitter_handle'] && `@${String(user['twitter_handle']).replace(/^@/, '')}`) ||
      (userName && `@${String(userName).replace(/^@/, '')}`) ||
      (typeof user['email'] === 'string' ? `@${user['email'].split('@')[0]}` : '@unknown');
    const rawAvatar =
      user['twitter_image'] ?? user['avatar'] ?? user['profile_image'] ?? user['profileImage'] ??
      user['photo'] ?? user['image'] ?? (Array.isArray(user['users_media_data']) ? user['users_media_data'][0] : undefined) ?? '';
    const platform = user['instagram_handle']
      ? 'Instagram'
      : user['twitter_handle']
        ? 'X'
        : user['facebook_username']
          ? 'Facebook'
          : '—';
    const status = String(row?.status ?? 'invited');
    const done = Number(row?.posts_published ?? 0) || 0;
    const total = Number(row?.posts_agreed ?? 0) || 0;
    const posts = this.toInfluencerPostRows((row as any)?.influencerPosts);
    const sum = (pick: (p: InfluencerPostRow) => number) => posts.reduce((acc, p) => acc + pick(p), 0);
    return {
      assignmentId: typeof row?.id === 'number' ? row.id : null,
      influencerId: typeof user['id'] === 'number' ? user['id'] : null,
      name: String(name),
      handle: String(handle),
      avatar: this.resolveFileUrl(typeof rawAvatar === 'string' ? rawAvatar : ''),
      platform,
      status: this.capitalize(status),
      statusClass: this.influencerStatusClass(status),
      done,
      total,
      posts,
      totalViews: sum((p) => p.latest?.views ?? 0),
      totalLikes: sum((p) => p.latest?.likes ?? 0),
      totalComments: sum((p) => p.latest?.comments ?? 0),
      totalShares: sum((p) => p.latest?.shares ?? 0),
    };
  }

  private toInfluencerPostRows(posts: unknown): InfluencerPostRow[] {
    if (!Array.isArray(posts)) return [];
    return posts.map((post) => {
      const p = (post ?? {}) as Record<string, any>;
      const snapshots = Array.isArray(p['metrics']) ? p['metrics'] : [];
      const latest = this.latestSnapshot(snapshots);
      const likes = Number(latest?.['likes'] ?? 0) || 0;
      const comments = Number(latest?.['comments'] ?? 0) || 0;
      const shares = Number(latest?.['shares'] ?? 0) || 0;
      const status = String(p['status'] ?? 'pending');
      return {
        id: typeof p['id'] === 'number' ? p['id'] : null,
        title: String(p['title'] ?? 'Untitled post'),
        contentType: String(p['content_type'] ?? p['contentType'] ?? 'post'),
        platform: String(p['platform'] ?? '—'),
        postUrl: String(p['post_url'] ?? p['postUrl'] ?? ''),
        publishedAt: String(p['published_at'] ?? p['publishedAt'] ?? ''),
        status: this.capitalize(status),
        statusClass: this.postStatusClass(status),
        payoutAmount: Number(p['payout_amount'] ?? p['payoutAmount'] ?? 0) || 0,
        paymentStatus: String(p['payment_status'] ?? p['paymentStatus'] ?? 'pending'),
        thumbnailUrl: this.resolveFileUrl(typeof p['thumbnail_url'] === 'string' ? p['thumbnail_url'] : (typeof p['thumbnailUrl'] === 'string' ? p['thumbnailUrl'] : '')),
        snapshots: snapshots.length,
        latest: latest
          ? {
              views: Number(latest['views'] ?? 0) || 0,
              likes,
              comments,
              shares,
              recorded_at: latest['recorded_at'] ?? latest['recordedAt'],
            }
          : null,
        engagement: likes + comments + shares,
      };
    });
  }

  private latestSnapshot(snapshots: Record<string, any>[]): Record<string, any> | null {
    if (snapshots.length === 0) return null;
    return [...snapshots].sort((a, b) =>
      String(a['recorded_at'] ?? a['recordedAt'] ?? '').localeCompare(
        String(b['recorded_at'] ?? b['recordedAt'] ?? ''),
      ),
    ).at(-1) ?? null;
  }

  private postStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'published':
      case 'approved':
        return 'green';
      case 'submitted':
        return 'blue';
      case 'pending':
      default:
        return 'amber';
    }
  }

  private influencerStatusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'active':
      case 'contracted':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'invited':
      case 'applied':
      default:
        return 'amber';
    }
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) img.style.visibility = 'hidden';
  }

  trackInfluencerRow(_index: number, row: CampaignInfluencerRow): number | string {
    return row.assignmentId ?? row.influencerId ?? row.handle;
  }

  expandedInfluencerKey: number | string | null = null;

  toggleInfluencerPosts(row: CampaignInfluencerRow): void {
    const key = this.trackInfluencerRow(0, row);
    this.expandedInfluencerKey = this.expandedInfluencerKey === key ? null : key;
  }

  isInfluencerExpanded(row: CampaignInfluencerRow): boolean {
    return this.expandedInfluencerKey === this.trackInfluencerRow(0, row);
  }

  /** Full metrics are only meaningful once the influencer has submitted at least one post. */
  canViewFullMetrics(row: CampaignInfluencerRow): boolean {
    return row.posts.length > 0;
  }

  // Hardcoded placeholder escrow/deal progress until real negotiation data is wired up.
  getEscrowStage(campaign: Campaign): EscrowStage {
    const stages: EscrowStage[] = ['sent', 'negotiating', 'active', 'delivered', 'released'];
    return stages[campaign.id % stages.length];
  }

  getEscrowAmount(campaign: Campaign): number {
    return 50000 + ((campaign.id * 8317) % 450000);
  }


  getPlatforms(raw: string[]): string[] {
    try {
      return raw.flatMap((p) => JSON.parse(p));
    } catch {
      return raw;
    }
  }

  /** Normalize a platform name to an icon key (brand svg + readable label). */
  platformIcon(platform: string): string {
    const key = (platform ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (['twitter', 'x', 'xtwitter'].includes(key)) return 'x';
    if (['instagram', 'ig'].includes(key)) return 'instagram';
    if (['tiktok', 'tik-tok'].includes(key)) return 'tiktok';
    if (['youtube', 'yt'].includes(key)) return 'youtube';
    if (['facebook', 'fb', 'meta'].includes(key)) return 'facebook';
    return 'other';
  }

  campaignImage(campaign: Campaign): string {
    return this.campaignImages(campaign)[0] ?? this.FALLBACK_IMAGE;
  }

  readonly FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop';

  /** All usable media URLs for a campaign, after normalizing backend shapes. */
  campaignImages(campaign: Campaign): string[] {
    return this.normalizeFiles((campaign as any)?.files)
      .map((f) => this.resolveFileUrl(f))
      .filter((u) => !!u);
  }

  /** Backend sometimes returns JSON-stringified entries, objects, or relative paths. */
  private normalizeFiles(files: unknown): string[] {
    if (!files) return [];
    const out: string[] = [];
    const pushValue = (v: unknown): void => {
      if (v == null) return;
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) return;
        // Handle entries like '["a.jpg","b.jpg"]' or '"a.jpg"'
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

  isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && img.src !== this.FALLBACK_IMAGE) {
      img.src = this.FALLBACK_IMAGE;
    }
  }

  accessLabel(access: string): string {
    const map: Record<string, string> = {
      open: 'Open',
      invite_only: 'Invite Only',
      application: 'Application',
    };
    return map[access] ?? this.capitalize(access);
  }

  openNewCampaign(): void {
    this.router.navigate(['/home/create-campaign']);
  }

  statusClass(access: string): string {
    const map: Record<string, string> = {
      open: 'status-active',
      closed: 'status-ended',
      draft: 'status-draft',
      paused: 'status-paused',
    };
    return map[access] ?? 'status-draft';
  }

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.goBack();
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew() {
    this.router.navigate(['/home/create-campaign']);
  }


  acceptApplicant(applicant: Applicant): void {
    applicant.status = 'accepted';
  }

  declineApplicant(applicant: Applicant): void {
    applicant.status = 'declined';
  }

  setActiveTab(tab: 'influencers' | 'invites'): void {
    this.activeTab = tab;
  }

  acceptInvite(invite: CampaignInfluencerRow): void {
    // Local-only until a status-update endpoint is wired up; moves the row to the Influencers tab.
    this.updateRowStatus(invite, 'Contracted', 'blue');
  }

  negotiateWith(invite: CampaignInfluencerRow): void {
    // Open negotiation modal or navigate to negotiation page
    console.log('Negotiate with:', invite.name);
    // TODO: Implement negotiation flow
  }

  declineInvite(invite: CampaignInfluencerRow): void {
    // Local-only until a status-update endpoint is wired up; moves the row to the Influencers tab.
    this.updateRowStatus(invite, 'Cancelled', 'red');
  }

  /** Replace (not mutate) the row so computed tab partitions re-evaluate.
   * Stored as an override so late-arriving posts can't clobber the local status. */
  private updateRowStatus(row: CampaignInfluencerRow, status: string, statusClass: string): void {
    const key = row.assignmentId ?? row.influencerId;
    if (key != null) {
      this.statusOverrides.set(key, { status, statusClass });
      this.refreshRows();
    } else {
      this.influencers.update((list) =>
        list.map((item) => (item === row ? { ...item, status, statusClass } : item)),
      );
    }
  }

  viewInfluencerMetrics(influencer: CampaignInfluencerRow): void {
    const id = influencer.influencerId ?? influencer.assignmentId ?? 1;
    const campaignId = Number(this.route.snapshot.paramMap.get('id'));
    this.router.navigate(
      ['/home/view-influencer-metrics', id],
      Number.isFinite(campaignId) && campaignId > 0 ? { queryParams: { campaignId } } : undefined,
    );
  }

  viewMore(invite: CampaignInfluencerRow): void {
    const id = invite.influencerId ?? invite.assignmentId ?? 1;
    this.router.navigate(['/home/view-pending-influencer-metrics', id]);
  }

  formatFollowers(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return String(count);
  }
}

