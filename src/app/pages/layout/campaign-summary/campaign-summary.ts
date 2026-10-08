import { DatePipe, AsyncPipe, NgSwitchDefault, NgSwitch, NgSwitchCase, CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, filter, forkJoin, map, Observable, of, Subject, switchMap, take, takeUntil, tap, timeout } from 'rxjs';
import { Campaign, CampaignLifecycle } from '../../../core/models/campaign/campaign.model';
import { selectCampaignList, selectCampaignLoading } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import { environment } from '../../../../environments/environment';
import {
  CampaignInfluencerPostService,
  CampaignInfluencerService,
  CampaignService as CampaignApi,
  InfluencerProfilesService,
  UpdateCampaignInfluencerDto,
} from '../../../core/api';
import { ToastService } from '../../../components/toast/toast.service';
import { extractApiList } from '../../../core/utils/api-response';
import { platformIconKey, platformLabel } from '../../../core/utils/platform-icon';
import { userDisplayName } from '../../../core/utils/user-display';
import type { CampaignInfluencer } from '../../../core/api/model/campaignInfluencer';
import type { CampaignInfluencerPost } from '../../../core/api/model/campaignInfluencerPost';
import { Negotiation } from "../../../components/negotiation/negotiation";
import { RealtimeEvent, SocketService } from '../../../socket.service';

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


@Component({
  selector: 'app-campaign-summary',
  imports: [DatePipe, AsyncPipe, Negotiation, NgSwitch,
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
  private campaignApi = inject(CampaignApi);
  private influencerProfilesApi = inject(InfluencerProfilesService);
  private socket = inject(SocketService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  isLoading$ = this.store.select(selectCampaignLoading);

  goBack(): void {
    this.location.back();
  }

  ngOnInit(): void {
    // Live: invites answered, offers moved, content submitted… on this campaign.
    this.socket
      .changes(
        RealtimeEvent.AssignmentUpdated,
        RealtimeEvent.NegotiationUpdated,
        RealtimeEvent.CampaignPostUpdated,
      )
      .pipe(
        filter((c) => c.campaignId != null && c.campaignId === Number(this.route.snapshot.paramMap.get('id'))),
        debounceTime(300),
        takeUntil(this.destroy$),
      )
      .subscribe((c) => this.reloadRoster(c.campaignId!));

    // Influencer picker search (Invite influencers dialog).
    this.pickerQuery$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.pickerSearching.set(true)),
        switchMap((query) =>
          this.influencerProfilesApi.influncerProfileControllerFindAll(10, 0, 'DESC', query).pipe(
            catchError(() => of(null)),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((res: any) => {
        this.pickerSearching.set(false);
        this.pickerResults.set(res?.data?.list ?? []);
      });

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
      .campaignInfluencerPostControllerFindByCampaign(campaignId, 'body', false, {
        transferCache: false,
      })
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
  private statusOverrides = new Map<number, string>();

  /** Rebuild rendered rows from raw data + fetched posts + local status overrides. */
  private refreshRows(): void {
    this.influencers.set(
      this.rawRoster.map((raw) => {
        const merged = this.withPopulatedPosts(raw, this.postsByAssignment);
        const rawId = (raw as Record<string, unknown>)['id'];
        const override = typeof rawId === 'number' ? this.statusOverrides.get(rawId) : undefined;
        if (!override) return merged;
        return { ...merged, status: override } as CampaignInfluencer;
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

  /** Details drawer state (invites tab). Only rows with an influencer profile open. */
  drawerRow = signal<CampaignInfluencer | null>(null);

  openDetails(row: CampaignInfluencer): void {
    if (!this.hasProfile(row)) return;
    this.drawerRow.set(row);
  }

  closeDetails(): void {
    this.drawerRow.set(null);
  }

  isAppliedInvite(row: CampaignInfluencer): boolean {
    return this.statusOf(row).trim().toLowerCase() === 'applied';
  }

  isInvitedInvite(row: CampaignInfluencer): boolean {
    return this.statusOf(row).trim().toLowerCase() === 'invited';
  }

  /** Invited rows jump straight to the negotiation widget for this influencer. */
  viewNegotiation(row:any): void {

    console.log('Viewing negotiation for row:', row);

    const assignmentId = row?.id;
    if (assignmentId == null) return;
    const campaignId = Number(this.route.snapshot.paramMap.get('id'));
    const queryParams: Record<string, number> = {};
    if (Number.isFinite(campaignId) && campaignId > 0) queryParams['campaignId'] = campaignId;
    const profileId = this.profileIdOf(row);
    if (profileId != null) queryParams['influencerId'] = profileId;
    this.closeDetails();
    this.router.navigate(
      ['/home/view-pending-influencer-metrics', assignmentId],
      {
        ...(Object.keys(queryParams).length > 0 ? { queryParams } : {}),
        fragment: 'negotiation',
      },
    );
    // this.router.navigate(['/home/negotiations']);
  }

  menuViewProfile(row: CampaignInfluencer): void {
    this.closeDetails();
    this.viewMore(row);
  }

  // Live roster from GET /campaign-influencer/campaign/{campaignId} (signals so the
  // zoneless view updates as soon as the data lands, without waiting for a tab click).
  influencers = signal<CampaignInfluencer[]>([]);
  influencersLoading = signal(false);
  influencersError = signal<string | null>(null);
  influencerSearch = signal('');

  private static readonly PENDING_STATUSES = ['invited', 'applied'];

  /** First tab: everything already on the campaign. Anything that is not
   * pending (including unexpected status values) lands here so rows never
   * silently disappear from both tabs. */
  readonly rosterInfluencers = computed(() =>
    this.influencers().filter(
      (inf) => !CampaignSummary.PENDING_STATUSES.includes(this.statusOf(inf).trim().toLowerCase()),
    ),
  );

  /** Second tab: pending pipeline (invited/applied). */
  readonly pendingInfluencers = computed(() =>
    this.influencers().filter((inf) =>
      CampaignSummary.PENDING_STATUSES.includes(this.statusOf(inf).trim().toLowerCase()),
    ),
  );

  readonly filteredInfluencers = computed(() => {
    const q = this.influencerSearch().trim().toLowerCase();
    return this.rosterInfluencers().filter((inf) => {
      const matchesSearch =
        !q ||
        this.displayName(inf).toLowerCase().includes(q) ||
        this.handleOf(inf).toLowerCase().includes(q);
      return matchesSearch && this.matchesStatusFilter(this.statusOf(inf));
    });
  });

  readonly filteredPending = computed(() => {
    const q = this.inviteSearch().trim().toLowerCase();
    return this.pendingInfluencers().filter((inf) => {
      const matchesSearch =
        !q ||
        this.displayName(inf).toLowerCase().includes(q) ||
        this.handleOf(inf).toLowerCase().includes(q);
      return matchesSearch && this.matchesPendingFilter(this.statusOf(inf));
    });
  });

  readonly influencerStats = computed(() => {
    const list = this.influencers();
    const norm = (s: string) => s.trim().toLowerCase();
    return {
      total: list.length,
      active: list.filter((i) => ['active', 'contracted'].includes(norm(this.statusOf(i)))).length,
      completed: list.filter((i) => norm(this.statusOf(i)) === 'completed').length,
      cancelled: list.filter((i) => norm(this.statusOf(i)) === 'cancelled').length,
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
    if (selected === 'declined' && ['cancelled', 'rejected'].includes(actual)) return true;
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
        .campaignInfluencerControllerFindByCampaign(campaignId, withPosts, 'body', false, {
          transferCache: false,
        })
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

  // ---------------------------------------------------------------------------
  // Row display reads straight from the raw assignment + the actual
  // `user.influencerProfile`. No fabrication: users without influencer data
  // render by name only and expose no actions.
  // ---------------------------------------------------------------------------

  /** The assigned user, tolerating both `user` and legacy `influencer` keys. */
  userOf(row: CampaignInfluencer): Record<string, any> {
    const raw = (row ?? {}) as Record<string, any>;
    const user = raw['user'] ?? raw['influencer'];
    return user != null && typeof user === 'object' ? (user as Record<string, any>) : {};
  }

  /** The actual influencer profile, or null when the user has none. */
  profileOf(row: CampaignInfluencer): Record<string, any> | null {
    const user = this.userOf(row);
    for (const key of ['influencerProfile', 'influncerProfile']) {
      const value = user[key];
      if (value != null && typeof value === 'object' && Object.keys(value).length > 0) {
        return value as Record<string, any>;
      }
    }
    return null;
  }

  /** Whether the row has real influencer data (gates every action). */
  hasProfile(row: CampaignInfluencer): boolean {
    return this.profileOf(row) != null;
  }

  /**
   * Influencer-profile id for navigation. This is NOT the user id: the
   * metrics page resolves it via the influencer-profiles endpoint.
   */
  profileIdOf(row: CampaignInfluencer): number | null {
    const profile = this.profileOf(row);
    const id = profile?.['id'];
    return typeof id === 'number' ? id : null;
  }

  displayName(row: CampaignInfluencer): string {
    const display = userDisplayName(this.userOf(row));
    return display === 'User' ? 'Unknown creator' : display;
  }

  handleOf(row: CampaignInfluencer): string {
    const user = this.userOf(row);
    const userName =
      user['user_name'] ?? user['userName'] ?? user['trendors_id'] ?? user['trendorsId'] ?? '';
    return (
      (user['instagram_handle'] && `@${String(user['instagram_handle']).replace(/^@/, '')}`) ||
      (user['twitter_handle'] && `@${String(user['twitter_handle']).replace(/^@/, '')}`) ||
      (userName && `@${String(userName).replace(/^@/, '')}`) ||
      (typeof user['email'] === 'string' ? `@${user['email'].split('@')[0]}` : '@unknown')
    );
  }

  avatarOf(row: CampaignInfluencer): string {
    const user = this.userOf(row);
    const rawAvatar =
      user['twitter_image'] ??
      user['avatar'] ??
      user['profile_image'] ??
      user['profileImage'] ??
      user['photo'] ??
      user['image'] ??
      (Array.isArray(user['users_media_data']) ? user['users_media_data'][0] : undefined) ??
      '';
    return this.resolveFileUrl(typeof rawAvatar === 'string' ? rawAvatar : '');
  }

  platformOf(row: CampaignInfluencer): string {
    const user = this.userOf(row);
    if (user['instagram_handle']) return 'Instagram';
    if (user['twitter_handle']) return 'X';
    if (user['facebook_username']) return 'Facebook';
    return '—';
  }

  statusOf(row: CampaignInfluencer): string {
    return String((row as Record<string, unknown>)?.['status'] ?? 'invited');
  }

  statusClassOf(row: CampaignInfluencer): string {
    return this.influencerStatusClass(this.statusOf(row));
  }

  doneOf(row: CampaignInfluencer): number {
    return Number((row as Record<string, unknown>)?.['posts_published'] ?? 0) || 0;
  }

  totalOf(row: CampaignInfluencer): number {
    return Number((row as Record<string, unknown>)?.['posts_agreed'] ?? 0) || 0;
  }

  feeAgreedOf(row: CampaignInfluencer): number {
    return Number((row as Record<string, unknown>)?.['fee_agreed'] ?? 0) || 0;
  }

  amountPaidOf(row: CampaignInfluencer): number {
    return Number((row as Record<string, unknown>)?.['amount_paid'] ?? 0) || 0;
  }

  paymentStatusOf(row: CampaignInfluencer): string {
    return String(
      (row as Record<string, unknown>)?.['payment_status'] ??
        (row as Record<string, unknown>)?.['paymentStatus'] ??
        'pending',
    );
  }

  /** Real submitted posts for the assignment (merged roster + posts endpoint). */
  postsOf(row: CampaignInfluencer): InfluencerPostRow[] {
    return this.toInfluencerPostRows((row as unknown as Record<string, unknown>)?.['influencerPosts']);
  }

  postTotals(row: CampaignInfluencer): {
    count: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } {
    const posts = this.postsOf(row);
    const sum = (pick: (p: InfluencerPostRow) => number) =>
      posts.reduce((acc, p) => acc + pick(p), 0);
    return {
      count: posts.length,
      views: sum((p) => p.latest?.views ?? 0),
      likes: sum((p) => p.latest?.likes ?? 0),
      comments: sum((p) => p.latest?.comments ?? 0),
      shares: sum((p) => p.latest?.shares ?? 0),
    };
  }

  /** Actual profile text field, trying each key in order. */
  profileText(row: CampaignInfluencer, keys: string[]): string {
    const profile = this.profileOf(row);
    if (!profile) return '';
    for (const key of keys) {
      const value = profile[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  /** Actual profile list field (array or single value). */
  profileList(row: CampaignInfluencer, keys: string[]): string[] {
    const profile = this.profileOf(row);
    if (!profile) return [];
    for (const key of keys) {
      const value = profile[key];
      if (Array.isArray(value)) {
        const list = value.map((v) => String(v ?? '').trim()).filter(Boolean);
        if (list.length > 0) return list;
      } else if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
      }
    }
    return [];
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
      case 'rejected':
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

  // Arrow property: ngFor `trackBy` invokes the fn detached from the
  // component, so `this` must be lexically captured.
  trackInfluencerRow = (_index: number, row: CampaignInfluencer): number | string => {
    const userId = (this.userOf(row) as Record<string, unknown>)?.['id'];
    return row?.id ?? (typeof userId === 'number' ? userId : this.handleOf(row));
  };

  expandedInfluencerKey: number | string | null = null;

  toggleInfluencerPosts(row: CampaignInfluencer): void {
    if (!this.hasProfile(row)) return;
    const key = this.trackInfluencerRow(0, row);
    this.expandedInfluencerKey = this.expandedInfluencerKey === key ? null : key;
  }

  isInfluencerExpanded(row: CampaignInfluencer): boolean {
    return this.expandedInfluencerKey === this.trackInfluencerRow(0, row);
  }

  /** Actions need a real influencer profile; full metrics additionally need posts. */
  canViewFullMetrics(row: CampaignInfluencer): boolean {
    return this.hasProfile(row) && this.postsOf(row).length > 0;
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
    return platformIconKey(platform);
  }

  platformName(platform: string): string {
    return platformLabel(platform);
  }

  /** Cover is the first still image; videos can't render in the cover <img>. */
  campaignImage(campaign: Campaign): string {
    return this.campaignImages(campaign).find((url) => !this.isVideoUrl(url)) ?? '';
  }

  hasImage(campaign: Campaign): boolean {
    return this.campaignImage(campaign) !== '';
  }

  /** Remaining media for the gallery, without repeating the cover. */
  galleryMedia(campaign: Campaign): string[] {
    const cover = this.campaignImage(campaign);
    return this.campaignImages(campaign).filter((url) => url !== cover);
  }

  campaignInitial(campaign: Campaign): string {
    return (campaign.name ?? '').trim().charAt(0).toUpperCase() || 'C';
  }

  /** Hashtags as a clean list whether the backend sends an array, CSV or JSON string. */
  hashTagList(campaign: Campaign): string[] {
    const raw: unknown = (campaign as unknown as Record<string, unknown>)['hash_tags'];
    const out: string[] = [];
    const pushText = (value: unknown): void => {
      if (typeof value !== 'string') return;
      for (const part of value.split(/[\s,]+/)) {
        const tag = part.trim();
        if (tag) out.push(tag.startsWith('#') ? tag : `#${tag}`);
      }
    };
    if (Array.isArray(raw)) {
      raw.forEach(pushText);
      return [...new Set(out)];
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(pushText);
            return [...new Set(out)];
          }
        } catch {
          // fall through to plain splitting
        }
      }
      pushText(trimmed);
    }
    return [...new Set(out)];
  }

  readonly FALLBACK_IMAGE =
    '/image-placeholder.svg';

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

  // Escape only dismisses overlays. It must never navigate: it also fires
  // while typing in the search inputs.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmCloseOpen()) {
      this.confirmCloseOpen.set(false);
      return;
    }
    if (this.editOpen()) {
      this.closeEdit();
      return;
    }
    if (this.inviteOpen()) {
      this.closeInvite();
      return;
    }
    if (this.drawerRow() != null) {
      this.closeDetails();
      return;
    }
    this.isFilterOpen = false;
    this.isPendingFilterOpen = false;
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew() {
    this.router.navigate(['/home/create-campaign']);
  }


  setActiveTab(tab: 'influencers' | 'invites'): void {
    this.activeTab = tab;
  }

  acceptInvite(invite: CampaignInfluencer): void {
    this.persistRowStatus(invite, UpdateCampaignInfluencerDto.StatusEnum.Contracted, 'accepted');
  }

  declineInvite(invite: CampaignInfluencer): void {
    this.persistRowStatus(invite, UpdateCampaignInfluencerDto.StatusEnum.Rejected, 'declined');
  }

  /** Optimistically move the row, save via PATCH /campaign-influencer/:id, roll back on failure. */
  private persistRowStatus(
    row: CampaignInfluencer,
    status: UpdateCampaignInfluencerDto.StatusEnum,
    verb: string,
  ): void {
    if (typeof row?.id !== 'number') {
      this.toast.show('This applicant cannot be updated yet.', 'error');
      return;
    }
    const previous = this.statusOf(row);
    this.updateRowStatus(row, status);
    this.campaignInfluencerApi
      .campaignInfluencerControllerUpdate(row.id, { status })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.toast.show(`${this.displayName(row)} ${verb}.`, 'success'),
        error: (err) => {
          this.updateRowStatus(row, previous);
          this.toast.show(err?.error?.message ?? `Could not update ${this.displayName(row)}.`, 'error');
        },
      });
  }

  /** Replace (not mutate) the row so computed tab partitions re-evaluate.
   * Stored as an override so late-arriving posts can't clobber the local status. */
  private updateRowStatus(row: CampaignInfluencer, status: string): void {
    if (typeof row?.id !== 'number') return;
    this.statusOverrides.set(row.id, status);
    this.refreshRows();
  }

  // ---------------------------------------------------------------------------
  // Campaign actions: pause / close / reopen, edit, invite influencers.
  // ---------------------------------------------------------------------------

  readonly campaignBusy = signal(false);
  readonly confirmCloseOpen = signal(false);

  campaignStatusOf(campaign: Campaign): CampaignLifecycle {
    const status = String(campaign?.status ?? 'active').toLowerCase();
    return status === 'paused' || status === 'closed' ? status : 'active';
  }

  /** Pause/resume/close/reopen. The API answers 200 with `error: true` on some failures, so check the body too. */
  setCampaignStatus(campaign: Campaign, status: CampaignLifecycle): void {
    if (campaign?.id == null || this.campaignBusy()) return;
    this.campaignBusy.set(true);
    this.campaignApi.campaignControllerUpdate(campaign.id, { status }).subscribe({
      next: (res) => {
        this.campaignBusy.set(false);
        this.confirmCloseOpen.set(false);
        if (res?.error) {
          this.toast.show(res?.message || 'Could not update the campaign.', 'error');
          return;
        }
        this.store.dispatch(CampaignActions.updateCampaignSuccess({ campaign: { id: campaign.id, status } }));
        const done = { active: 'Campaign is active again.', paused: 'Campaign paused.', closed: 'Campaign closed.' };
        this.toast.show(done[status], 'success');
      },
      error: (err) => {
        this.campaignBusy.set(false);
        this.toast.show(err?.error?.message || err?.message || 'Could not update the campaign.', 'error');
      },
    });
  }

  // --- Edit ---------------------------------------------------------------

  readonly editOpen = signal(false);
  readonly editSaving = signal(false);
  readonly editError = signal<string | null>(null);
  editForm = { name: '', description: '', link: '', start_date: '', end_date: '', hash_tags: '' };

  private toDateInput(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  openEdit(campaign: Campaign): void {
    this.editForm = {
      name: campaign.name ?? '',
      description: campaign.description ?? '',
      link: campaign.link ?? '',
      start_date: this.toDateInput(campaign.start_date),
      end_date: this.toDateInput(campaign.end_date),
      hash_tags: this.hashTagList(campaign).join(' '),
    };
    this.editError.set(null);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    if (this.editSaving()) return;
    this.editOpen.set(false);
  }

  saveEdit(campaign: Campaign): void {
    if (campaign?.id == null || this.editSaving()) return;
    const f = this.editForm;
    const name = f.name.trim();
    if (!name) {
      this.editError.set('Give the campaign a name.');
      return;
    }
    if (f.start_date && f.end_date && f.end_date < f.start_date) {
      this.editError.set('The end date can\'t be before the start date.');
      return;
    }
    const hashTags = [
      ...new Set(
        f.hash_tags
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`)),
      ),
    ];
    const changes = {
      name,
      description: f.description.trim(),
      link: f.link.trim(),
      // Empty string clears the date on the server.
      start_date: f.start_date,
      end_date: f.end_date,
      hash_tags: hashTags,
    };

    this.editSaving.set(true);
    this.editError.set(null);
    this.campaignApi.campaignControllerUpdate(campaign.id, changes).subscribe({
      next: (res) => {
        this.editSaving.set(false);
        if (res?.error) {
          this.editError.set(res?.message || 'Could not save your changes.');
          return;
        }
        this.store.dispatch(
          CampaignActions.updateCampaignSuccess({
            campaign: {
              id: campaign.id,
              name,
              description: changes.description,
              link: changes.link || null,
              start_date: f.start_date || null,
              end_date: f.end_date || null,
              hash_tags: hashTags as any,
            },
          }),
        );
        this.editOpen.set(false);
        this.toast.show('Campaign updated.', 'success');
      },
      error: (err) => {
        this.editSaving.set(false);
        const message = err?.error?.message;
        this.editError.set(
          (Array.isArray(message) ? message.join(', ') : message) || err?.message || 'Could not save your changes.',
        );
      },
    });
  }

  // --- Invite influencers ---------------------------------------------------

  readonly inviteOpen = signal(false);
  readonly inviteSending = signal(false);
  readonly pickerQuery = signal('');
  readonly pickerSearching = signal(false);
  readonly pickerResults = signal<any[]>([]);
  readonly pickerSelected = signal<any[]>([]);
  private pickerQuery$ = new Subject<string>();

  openInvite(): void {
    this.pickerQuery.set('');
    this.pickerResults.set([]);
    this.pickerSelected.set([]);
    this.inviteOpen.set(true);
    this.pickerQuery$.next('');
  }

  closeInvite(): void {
    if (this.inviteSending()) return;
    this.inviteOpen.set(false);
  }

  onPickerSearch(query: string): void {
    this.pickerQuery.set(query);
    this.pickerQuery$.next(query.trim());
  }

  pickerUserId(profile: any): number | null {
    const id = Number(profile?.user?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  pickerName(profile: any): string {
    const full = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return full || userDisplayName(profile?.user ?? {}) || 'Creator';
  }

  /** Already invited, applied or working on this campaign. */
  pickerInCampaign(profile: any): boolean {
    const id = this.pickerUserId(profile);
    return id != null && this.rawRoster.some((row) => Number(this.userOf(row)['id']) === id);
  }

  pickerIsSelected(profile: any): boolean {
    const id = this.pickerUserId(profile);
    return id != null && this.pickerSelected().some((p) => this.pickerUserId(p) === id);
  }

  togglePicked(profile: any): void {
    if (this.pickerUserId(profile) == null || this.pickerInCampaign(profile)) return;
    this.pickerSelected.update((list) =>
      this.pickerIsSelected(profile)
        ? list.filter((p) => this.pickerUserId(p) !== this.pickerUserId(profile))
        : [...list, profile],
    );
  }

  /** Each invite creates an `invited` assignment, which is what the Invites tab and negotiation work from. */
  sendInvites(campaign: Campaign): void {
    const picked = this.pickerSelected();
    if (campaign?.id == null || picked.length === 0 || this.inviteSending()) return;
    this.inviteSending.set(true);
    forkJoin(
      picked.map((profile) =>
        this.campaignInfluencerApi
          .campaignInfluencerControllerCreate({ campaignId: campaign.id, userId: this.pickerUserId(profile)! })
          .pipe(
            map(() => ({ ok: true, name: this.pickerName(profile), reason: '' })),
            catchError((err) =>
              of({ ok: false, name: this.pickerName(profile), reason: err?.error?.message || err?.message || 'failed' }),
            ),
          ),
      ),
    ).subscribe((results) => {
      this.inviteSending.set(false);
      const sent = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (sent > 0) {
        this.toast.show(`Invited ${sent} influencer${sent === 1 ? '' : 's'}.`, 'success');
        this.reloadRoster(campaign.id);
        this.setActiveTab('invites');
      }
      if (failed.length > 0) {
        this.toast.show(`Could not invite ${failed.map((f) => f.name).join(', ')}: ${failed[0].reason}`, 'error', 6000);
        // Keep only the failures selected so they can be retried.
        this.pickerSelected.update((list) => list.filter((p) => failed.some((f) => f.name === this.pickerName(p))));
      } else {
        this.inviteOpen.set(false);
      }
    });
  }

  private reloadRoster(campaignId: number): void {
    this.loadPostsForCampaign(campaignId);
    this.rosterForCampaign(campaignId)
      .pipe(take(1), catchError(() => of(null)))
      .subscribe((roster) => {
        if (roster == null) return;
        this.rawRoster = roster;
        this.refreshRows();
      });
  }

  /** Hands the roster row over via router state: the posts-by-assignment endpoint doesn't embed the user, so the metrics page can't rebuild the header on its own. */
  viewInfluencerMetrics(influencer: CampaignInfluencer, campaignName?: string): void {
    if (influencer?.id == null) return;
    const campaignId = Number(this.route.snapshot.paramMap.get('id'));
    this.router.navigate(['/home/view-influencer-metrics', influencer.id], {
      ...(Number.isFinite(campaignId) && campaignId > 0 ? { queryParams: { campaignId } } : {}),
      state: { influencer, campaignName },
    });
  }

  viewMore(invite: CampaignInfluencer): void {
    if (invite?.id == null) return;
    const campaignId = Number(this.route.snapshot.paramMap.get('id'));
    const queryParams: Record<string, number> = {};
    if (Number.isFinite(campaignId) && campaignId > 0) queryParams['campaignId'] = campaignId;
    const profileId = this.profileIdOf(invite);
    if (profileId != null) queryParams['influencerId'] = profileId;
    this.router.navigate(
      ['/home/view-pending-influencer-metrics', invite.id],
      Object.keys(queryParams).length > 0 ? { queryParams } : undefined,
    );
  }

  formatFollowers(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return String(count);
  }
}

