
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InfluencerProfilesService } from '../../../core/api';
import { Negotiation } from '../../../components/negotiation/negotiation';
import { extractFollowers, formatCompactNumber } from '../../../core/utils/influencer-stats';

@Component({
  selector: 'app-view-pending-influencer-metrics',
  imports: [CommonModule, Negotiation],
  templateUrl: './view-pending-influencer-metrics.html',
  styleUrl: './view-pending-influencer-metrics.scss',
})
export class ViewPendingInfluencerMetricsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private influencerProfileApi = inject(InfluencerProfilesService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  profile: any = null;
  isLoading = false;
  loadError: string | null = null;
  viewMode = 'brand';
  campaignId = 0;
  influencerId = 0;
  campaignInfluencerId: number | null = null;

  /** Falls back to the username when first/last name aren't set. */
  get influencerDisplayName(): string {
    const first = this.profile?.user?.first_name;
    const last = this.profile?.user?.last_name;
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || this.profile?.user?.user_name || 'Influencer';
  }

  /** Real follower count from the profile or its user; empty when unknown. */
  get followersLabel(): string {
    const count = Math.max(extractFollowers(this.profile) ?? 0, extractFollowers(this.profile?.user) ?? 0);
    return count > 0 ? formatCompactNumber(count) : '';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.campaignInfluencerId = Number(params.get('id')) || null;
      this.cdr.markForCheck();
    });

    this.route.queryParamMap
      .pipe(
        tap((params) => (this.campaignId = Number(params.get('campaignId')) || 0)),
        map((params) => Number(params.get('influencerId')) || 0),
        distinctUntilChanged(),
        tap((influencerId) => {
          this.influencerId = influencerId;
          this.profile = null;
          // Without a profile id the negotiation below still works; only the
          // profile header is unavailable.
          this.loadError = influencerId ? null : 'Influencer profile unavailable.';
          this.isLoading = !!influencerId;
          this.cdr.markForCheck();
        }),
        switchMap((influencerId) =>
          influencerId
            ? this.influencerProfileApi.influncerProfileControllerFindOne(influencerId).pipe(
                catchError((err) => {
                  console.error(err);
                  this.loadError = 'Could not load influencer profile.';
                  return of(null);
                }),
              )
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) this.profile = (res as any)?.data ?? res;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  goBack(): void {
    window.history.back();
  }
}
