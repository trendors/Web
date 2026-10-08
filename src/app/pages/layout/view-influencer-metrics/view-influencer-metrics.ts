import { Component, ChangeDetectorRef, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, filter } from 'rxjs';
import { RealtimeEvent, SocketService } from '../../../socket.service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CampaignInfluencerPostService, CampaignInfluencerService, PostMetricsService } from '../../../core/api';
import { extractApiList } from '../../../core/utils/api-response';
import { userDisplayName } from '../../../core/utils/user-display';
import type { CampaignInfluencer } from '../../../core/api/model/campaignInfluencer';
import type { CampaignInfluencerPost } from '../../../core/api/model/campaignInfluencerPost';
import { environment } from '../../../../environments/environment';

interface ContentMetric {
    id: number | null;
    type: string;
    platform: string;
    /** ISO date string; empty when not published yet. */
    date: string;
    postUrl: string;
    payout: number;
    status: 'Paid' | 'Pending';
    views: number;
    likes: number;
    comments: number;
    shares: number;
}

interface InfluencerHeader {
    name: string;
    username: string;
    campaign: string;
    avatar: string;
    status: string;
    statusActive: boolean;
    platform: string;
    completed: number;
    totalContent: number;
    totalPayout: number;
    paid: number;
    pending: number;
}

const FALLBACK_AVATAR =
    '/avatar-placeholder.svg';

@Component({
    selector: 'app-view-influencer-metrics',
    imports: [CommonModule],
    templateUrl: './view-influencer-metrics.html',
    styleUrl: './view-influencer-metrics.scss',
})
export class InfluencerMetricsComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private influencerPostApi = inject(CampaignInfluencerPostService);
    private assignmentApi = inject(CampaignInfluencerService);
    private metricsApi = inject(PostMetricsService);
    private cdr = inject(ChangeDetectorRef);
    private socket = inject(SocketService);
    private destroyRef = inject(DestroyRef);

    loading = signal(true);
    error = signal<string | null>(null);
    contents = signal<ContentMetric[]>([]);
    readonly fallbackAvatar = FALLBACK_AVATAR;

    /** Assignment row handed over by campaign-summary (router state), or fetched on a hard refresh. */
    private assignment = signal<CampaignInfluencer | null>(null);
    private posts = signal<CampaignInfluencerPost[]>([]);
    private campaignName = signal('');
    private metricsRequested = false;

    header = computed<InfluencerHeader | null>(() => {
        const posts = this.posts();
        const assignment =
            this.assignment() ?? posts.map((post) => this.assignmentOfPost(post)).find((row) => row != null) ?? null;
        if (!assignment && posts.length === 0) return null;
        return this.toHeader(assignment, this.contents());
    });

    completionPercentage = computed(() => {
        const header = this.header();
        if (!header?.totalContent) {
            return 0;
        }

        return Math.round((header.completed / header.totalContent) * 100);
    });

    paidPercentage = computed(() => {
        const header = this.header();
        if (!header?.totalPayout) return 0;
        return Math.min(100, Math.round((header.paid / header.totalPayout) * 100));
    });

    totals = computed(() =>
        this.contents().reduce(
            (acc, c) => ({
                views: acc.views + c.views,
                likes: acc.likes + c.likes,
                comments: acc.comments + c.comments,
                shares: acc.shares + c.shares,
                payout: acc.payout + c.payout,
            }),
            { views: 0, likes: 0, comments: 0, shares: 0, payout: 0 },
        ),
    );

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        this.socket
            .changes(RealtimeEvent.CampaignPostUpdated, RealtimeEvent.AssignmentUpdated)
            .pipe(
                filter((c) => c.assignmentId === id),
                debounceTime(300),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                this.metricsRequested = false;
                this.fetchPosts();
            });

        const state = (this.location.getState() ?? {}) as { influencer?: CampaignInfluencer; campaignName?: string };
        if (state.influencer && typeof state.influencer === 'object') this.assignment.set(state.influencer);
        if (state.campaignName) this.campaignName.set(state.campaignName);
        if (!this.assignment()) this.fetchAssignment();
        this.fetchPosts();
    }

    /** Hard refresh / deep link: no router state, so load the assignment itself for the header. */
    private fetchAssignment(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isFinite(id) || id <= 0) return;
        this.assignmentApi.campaignInfluencerControllerFindOne(id, false, 'body', false, { transferCache: false }).subscribe({
            next: (res) => {
                const body = res as Record<string, any> | null;
                const row = body != null && 'data' in body ? body['data'] : body;
                if (row != null && typeof row === 'object' && !Array.isArray(row) && Object.keys(row).length > 0) {
                    this.assignment.set(row as CampaignInfluencer);
                    if (this.error()) this.error.set(null);
                    this.fetchMetrics();
                    this.cdr.detectChanges();
                }
            },
            error: () => {
                // Header falls back to whatever the posts embed.
            },
        });
    }

    /** The route id is the campaign-influencer assignment id, so posts come straight from its own endpoint — no campaign-wide fetch or client-side filtering. */
    fetchPosts(): void {
        const campaignInfluencerId = Number(this.route.snapshot.paramMap.get('id'));
        if (!Number.isFinite(campaignInfluencerId) || campaignInfluencerId <= 0) {
            this.loading.set(false);
            this.error.set('Missing influencer context.');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        this.influencerPostApi
            .campaignInfluencerPostControllerFindByAssignment(campaignInfluencerId, 'body', false, {
              transferCache: false,
            })
            .subscribe({
                next: (res) => {
                    this.loading.set(false);
                    const posts = this.normalizePosts(res);
                    this.posts.set(posts);
                    this.contents.set(posts.map((post) => this.toContent(post)));
                    // With a known assignment, no posts just means an empty table, not an error.
                    if (posts.length === 0 && !this.assignment()) {
                        this.error.set('No posts found for this influencer in this campaign.');
                    }
                    this.fetchMetrics();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.loading.set(false);
                    this.error.set(err?.message || 'Failed to load influencer metrics');
                    this.posts.set([]);
                    this.contents.set([]);
                    this.cdr.detectChanges();
                },
            });
    }

    /** `findByAssignment` doesn't eager-load `metrics`, so pull the latest numbers per post separately and merge them in. */
    private fetchMetrics(): void {
        const posts = this.posts();
        if (this.metricsRequested || posts.length === 0) return;
        const assignment = this.assignment() ?? this.assignmentOfPost(posts[0]);
        const raw = (assignment ?? {}) as Record<string, any>;
        const userId = this.userOf(assignment)['id'] ?? raw['user_id'] ?? raw['userId'];
        if (typeof userId !== 'number') return;
        this.metricsRequested = true;

        this.metricsApi.postMetricsControllerByInfluencer(userId, 'body', false, { transferCache: false }).subscribe({
            next: (res) => {
                const rows = (extractApiList(res) as Record<string, any>[]).filter((r) => !!r);
                const byPostId = new Map<number, Record<string, any>>();
                for (const row of rows) {
                    const postId = row['campaignInfluencerPostId'] ?? row['postId'] ?? row['campaignInfluencerPost']?.['id'];
                    if (typeof postId === 'number') byPostId.set(postId, row);
                }
                if (byPostId.size === 0) return;
                this.contents.update((list) =>
                    list.map((content) => {
                        if (content.id == null) return content;
                        const row = byPostId.get(content.id);
                        if (!row) return content;
                        return {
                            ...content,
                            views: Number(row['views'] ?? 0) || 0,
                            likes: Number(row['likes'] ?? 0) || 0,
                            comments: Number(row['comments'] ?? 0) || 0,
                            shares: Number(row['shares'] ?? 0) || 0,
                        };
                    }),
                );
                this.cdr.detectChanges();
            },
            error: () => {
                // Metrics are supplementary; leave posts showing zeroed-out numbers on failure.
            },
        });
    }

    private normalizePosts(res: unknown): CampaignInfluencerPost[] {
        return extractApiList(res) as CampaignInfluencerPost[];
    }

    private assignmentOfPost(post: CampaignInfluencerPost): CampaignInfluencer | null {
        const ref = (post as Record<string, any>)?.['campaignInfluencer'];
        return ref != null && typeof ref === 'object' ? (ref as CampaignInfluencer) : null;
    }

    /** The assigned user, tolerating both `user` and legacy `influencer` keys. */
    private userOf(assignment: CampaignInfluencer | null): Record<string, any> {
        const raw = (assignment ?? {}) as Record<string, any>;
        const user = raw['user'] ?? raw['influencer'];
        return user != null && typeof user === 'object' ? (user as Record<string, any>) : {};
    }

    private toHeader(assignment: CampaignInfluencer | null, contents: ContentMetric[]): InfluencerHeader {
        const row = (assignment ?? {}) as Record<string, any>;
        const user = this.userOf(assignment);
        const display = userDisplayName(user);
        const name = display === 'User' ? 'Unknown creator' : display;
        const userName = user['user_name'] ?? user['userName'] ?? '';
        const handle =
            (user['instagram_handle'] && `@${String(user['instagram_handle']).replace(/^@/, '')}`) ||
            (user['twitter_handle'] && `@${String(user['twitter_handle']).replace(/^@/, '')}`) ||
            (userName && `@${String(userName).replace(/^@/, '')}`) ||
            '@unknown';
        const rawAvatar =
            user['twitter_image'] ?? user['avatar'] ?? user['profile_image'] ?? user['profileImage'] ??
            (Array.isArray(user['users_media_data']) ? user['users_media_data'][0] : undefined) ?? '';
        const campaign = row['campaign'] as Record<string, any> | undefined;
        const status = String(row['status'] ?? 'invited');
        const agreed = Number(row['posts_agreed'] ?? 0) || 0;
        const published = Number(row['posts_published'] ?? 0) || 0;
        const feeAgreed = Number(row['fee_agreed'] ?? 0) || 0;
        const amountPaid = Number(row['amount_paid'] ?? 0) || 0;
        const payoutFromPosts = contents.reduce((sum, content) => sum + content.payout, 0);
        const paidFromPosts = contents
            .filter((content) => content.status === 'Paid')
            .reduce((sum, content) => sum + content.payout, 0);
        const totalPayout = feeAgreed > 0 ? feeAgreed : payoutFromPosts;
        const paid = amountPaid > 0 ? amountPaid : paidFromPosts;
        return {
            name: String(name),
            username: String(handle),
            campaign: String(campaign?.['name'] ?? (this.campaignName() || 'Campaign')),
            avatar: this.resolveUrl(typeof rawAvatar === 'string' ? rawAvatar : '') || FALLBACK_AVATAR,
            status: this.capitalize(status),
            statusActive: ['active', 'contracted', 'completed'].includes(status.trim().toLowerCase()),
            platform: user['instagram_handle']
                ? 'Instagram'
                : user['twitter_handle']
                  ? 'X'
                  : (user['facebook_username'] ? 'Facebook' : '—'),
            completed: published > 0 ? published : contents.filter((c) => c.date !== '').length,
            totalContent: agreed > 0 ? agreed : contents.length,
            totalPayout,
            paid,
            pending: Math.max(totalPayout - paid, 0),
        };
    }

    private toContent(post: CampaignInfluencerPost): ContentMetric {
        const p = (post ?? {}) as Record<string, any>;
        const latest = this.latestSnapshot(Array.isArray(p['metrics']) ? p['metrics'] : []);
        const paid = String(p['payment_status'] ?? p['paymentStatus'] ?? 'pending').toLowerCase() === 'paid';
        return {
            id: typeof p['id'] === 'number' ? p['id'] : null,
            type: this.capitalize(String(p['content_type'] ?? p['contentType'] ?? 'post')),
            platform: String(p['platform'] ?? '—'),
            date: String(p['published_at'] ?? p['publishedAt'] ?? (p['post_url'] ?? p['postUrl'] ? (p['created_at'] ?? p['createdAt'] ?? '') : '')),
            postUrl: String(p['post_url'] ?? p['postUrl'] ?? ''),
            payout: Number(p['payout_amount'] ?? p['payoutAmount'] ?? 0) || 0,
            status: paid ? 'Paid' : 'Pending',
            views: Number(latest?.['views'] ?? 0) || 0,
            likes: Number(latest?.['likes'] ?? 0) || 0,
            comments: Number(latest?.['comments'] ?? 0) || 0,
            shares: Number(latest?.['shares'] ?? 0) || 0,
        };
    }

    private latestSnapshot(snapshots: Record<string, any>[]): Record<string, any> | null {
        if (snapshots.length === 0) return null;
        return (
            [...snapshots]
                .sort((a, b) =>
                    String(a['recorded_at'] ?? a['recordedAt'] ?? '').localeCompare(
                        String(b['recorded_at'] ?? b['recordedAt'] ?? ''),
                    ),
                )
                .at(-1) ?? null
        );
    }

    private resolveUrl(file: string): string {
        const trimmed = (file ?? '').trim();
        if (!trimmed) return '';
        if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('//')) return `https:${trimmed}`;
        const base = (environment.apiUrl ?? '').replace(/\/+$/, '');
        return base ? `${base}/${trimmed.replace(/^\.?\//, '')}` : `/${trimmed.replace(/^\.?\//, '')}`;
    }

    private capitalize(s: string): string {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    formatCompact(value: number): string {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        }

        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }

        return value.toString();
    }

    onImgError(event: Event, fallback: string): void {
        const img = event.target as HTMLImageElement | null;
        if (img && img.src !== fallback) {
            img.src = fallback;
        }
    }

    goBack(): void {
        // go back to previous page
        this.location.back();
    }
}
