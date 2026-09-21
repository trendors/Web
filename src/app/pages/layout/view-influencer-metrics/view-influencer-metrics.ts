import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, combineLatest, map, Observable, of, Subject, switchMap, takeUntil, tap, timeout } from 'rxjs';
import { CampaignInfluencerPostService } from '../../../core/api';
import { extractApiList } from '../../../core/utils/api-response';
import { userDisplayName } from '../../../core/utils/user-display';
import type { CampaignInfluencer } from '../../../core/api/model/campaignInfluencer';
import type { CampaignInfluencerPost } from '../../../core/api/model/campaignInfluencerPost';
import { environment } from '../../../../environments/environment';

interface ContentMetric {
    id: number | null;
    title: string;
    type: string;
    platform: string;
    /** ISO date string; empty when not published yet. */
    date: string;
    image: string;
    postUrl: string;
    payout: number;
    payoutLabel: 'Paid out' | 'To be paid';
    status: 'Paid' | 'Pending';
    views: number;
    likes: number;
    comments: number;
    shares: number;
    snapshots: number;
    recordedAt: string;
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
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop';
const FALLBACK_THUMB =
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=300&fit=crop';

@Component({
    selector: 'app-view-influencer-metrics',
    imports: [CommonModule],
    templateUrl: './view-influencer-metrics.html',
    styleUrl: './view-influencer-metrics.scss',
})
export class InfluencerMetricsComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private influencerPostApi = inject(CampaignInfluencerPostService);
    private destroy$ = new Subject<void>();

    loading = signal(true);
    error = signal<string | null>(null);
    header = signal<InfluencerHeader | null>(null);
    contents = signal<ContentMetric[]>([]);
    readonly fallbackAvatar = FALLBACK_AVATAR;
    readonly fallbackThumb = FALLBACK_THUMB;

    completionPercentage = computed(() => {
        const header = this.header();
        if (!header?.totalContent) {
            return 0;
        }

        return Math.round((header.completed / header.totalContent) * 100);
    });

    totalViews = computed(() =>
        this.formatCompact(this.contents().reduce((total, content) => total + content.views, 0)),
    );

    ngOnInit(): void {
        combineLatest([this.route.paramMap, this.route.queryParamMap])
            .pipe(
                map(([params, query]) => ({
                    influencerId: Number(params.get('id')),
                    campaignId: Number(query.get('campaignId')),
                })),
                tap(() => {
                    this.loading.set(true);
                    this.error.set(null);
                }),
                switchMap(({ influencerId, campaignId }) => this.loadPosts(influencerId, campaignId)),
                // Never leave the page stuck on "Loading…": a hanging backend
                // surfaces as an error instead.
                timeout(25000),
                catchError((err) => {
                    this.error.set(err?.message || 'Failed to load influencer metrics');
                    return of(null);
                }),
                takeUntil(this.destroy$),
            )
            .subscribe({
                next: (posts) => {
                    this.loading.set(false);
                    if (!posts || posts.length === 0) {
                        if (!this.error()) this.error.set('No posts found for this influencer in this campaign.');
                        this.header.set(null);
                        this.contents.set([]);
                        return;
                    }
                    this.header.set(this.toHeader(posts));
                    this.contents.set(posts.map((post) => this.toContent(post)));
                },
                error: (err) => {
                    this.loading.set(false);
                    this.error.set(err?.message || 'Failed to load influencer metrics');
                    this.header.set(null);
                    this.contents.set([]);
                },
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * The page works off campaign-influencer posts only: fetch every post on the
     * campaign, then keep the ones belonging to the requested influencer
     * (matched by influencer id or assignment id).
     */
    private loadPosts(influencerId: number, campaignId: number): Observable<CampaignInfluencerPost[] | null> {
        if (!Number.isFinite(campaignId) || campaignId <= 0) {
            this.error.set('Missing campaign context.');
            return of(null);
        }
        return this.influencerPostApi
            .campaignInfluencerPostControllerFindByCampaign(campaignId, 'body', false, {
              transferCache: false,
            })
            .pipe(
                map((res) => this.normalizePosts(res)),
                map((posts) =>
                    posts.filter((post) => {
                        const assignment = this.assignmentOfPost(post);
                        const ownerId = (assignment as Record<string, any> | null)?.['influencer']
                            ? ((assignment as Record<string, any>)['influencer'] as Record<string, any>)['id']
                            : null;
                        return (
                            (typeof ownerId === 'number' && ownerId === influencerId) ||
                            (typeof assignment?.id === 'number' && assignment.id === influencerId)
                        );
                    }),
                ),
            );
    }

    private normalizePosts(res: unknown): CampaignInfluencerPost[] {
        return extractApiList(res) as CampaignInfluencerPost[];
    }

    private assignmentOfPost(post: CampaignInfluencerPost): CampaignInfluencer | null {
        const ref = (post as Record<string, any>)?.['campaignInfluencer'];
        return ref != null && typeof ref === 'object' ? (ref as CampaignInfluencer) : null;
    }

    private toHeader(posts: CampaignInfluencerPost[]): InfluencerHeader {
        const assignment =
            posts
                .map((post) => this.assignmentOfPost(post))
                .find((row) => row != null) ?? ({} as CampaignInfluencer);
        const row = (assignment ?? {}) as Record<string, any>;
        const user = (row['influencer'] ?? {}) as Record<string, any>;
        const display = userDisplayName(user);
        const name = display === 'User' ? 'Unknown creator' : display;
        const userName = user['user_name'] ?? user['userName'] ?? '';
        const handle =
            (user['instagram_handle'] && `@${String(user['instagram_handle']).replace(/^@/, '')}`) ||
            (user['twitter_handle'] && `@${String(user['twitter_handle']).replace(/^@/, '')}`) ||
            (userName && `@${String(userName).replace(/^@/, '')}`) ||
            '@unknown';
        const rawAvatar =
            user['twitter_image'] ?? user['avatar'] ?? user['profile_image'] ??
            (Array.isArray(user['users_media_data']) ? user['users_media_data'][0] : undefined) ?? '';
        const campaign = row['campaign'] as Record<string, any> | undefined;
        const status = String(row['status'] ?? 'invited');
        const contents = posts.map((post) => this.toContent(post));
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
            campaign: String(campaign?.['name'] ?? 'Campaign'),
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
        const snapshots = Array.isArray(p['metrics']) ? p['metrics'] : [];
        const latest = this.latestSnapshot(snapshots);
        const paid = String(p['payment_status'] ?? p['paymentStatus'] ?? 'pending').toLowerCase() === 'paid';
        return {
            id: typeof p['id'] === 'number' ? p['id'] : null,
            title: String(p['title'] ?? 'Untitled post'),
            type: this.capitalize(String(p['content_type'] ?? p['contentType'] ?? 'post')),
            platform: String(p['platform'] ?? '—'),
            date: String(p['published_at'] ?? p['publishedAt'] ?? ''),
            image:
                this.resolveUrl(
                    typeof p['thumbnail_url'] === 'string'
                        ? p['thumbnail_url']
                        : (typeof p['thumbnailUrl'] === 'string' ? p['thumbnailUrl'] : ''),
                ) || FALLBACK_THUMB,
            postUrl: String(p['post_url'] ?? p['postUrl'] ?? ''),
            payout: Number(p['payout_amount'] ?? p['payoutAmount'] ?? 0) || 0,
            payoutLabel: paid ? 'Paid out' : 'To be paid',
            status: paid ? 'Paid' : 'Pending',
            views: Number(latest?.['views'] ?? 0) || 0,
            likes: Number(latest?.['likes'] ?? 0) || 0,
            comments: Number(latest?.['comments'] ?? 0) || 0,
            shares: Number(latest?.['shares'] ?? 0) || 0,
            snapshots: snapshots.length,
            recordedAt: String(latest?.['recorded_at'] ?? latest?.['recordedAt'] ?? ''),
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

    openPost(content: ContentMetric): void {
        if (content.postUrl) {
            window.open(content.postUrl, '_blank');
        }
    }

    getPlatformIcon(platform: string): string {
        switch (platform) {
            case 'Instagram':
                return '◎';

            case 'TikTok':
                return '♪';

            case 'Facebook':
                return 'f';

            case 'YouTube':
                return '▶';

            case 'X':
                return '𝕏';

            default:
                return '•';
        }
    }
}
