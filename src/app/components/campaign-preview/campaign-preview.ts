import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CampaignInfluencerService, CampaignService, CreateCampaignInfluencerDto } from '../../core/api';
import { extractApiList } from '../../core/utils/api-response';
import { hasCreativeProfile } from '../../core/utils/user-display';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { ToastService } from '../toast/toast.service';
import { platformLabel } from '../../core/utils/platform-icon';

/** Read-only campaign details, opened from Trending ads. Same view for brands and influencers. */
@Component({
  selector: 'app-campaign-preview',
  imports: [CommonModule, DatePipe],
  templateUrl: './campaign-preview.html',
  styleUrl: './campaign-preview.scss',
})
export class CampaignPreview implements OnInit {
  private api = inject(CampaignService);
  private cdr = inject(ChangeDetectorRef);
  private influencerApi = inject(CampaignInfluencerService);
  private store = inject(Store);
  private toast = inject(ToastService);
  private ref = inject(MatDialogRef<CampaignPreview>);
  data = inject<{ id: number; name?: string }>(MAT_DIALOG_DATA);

  campaign: Record<string, any> | null = null;
  platforms: string[] = [];
  loading = true;
  userId: number | null = null;
  isInfluencer = false;
  /** Status of this user's existing application/assignment, if any. */
  existingStatus: string | null = null;
  applying = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadViewer();
    this.api.campaignControllerFindOne(this.data.id, 'body', false, { transferCache: false }).subscribe({
      next: (res) => {
        this.campaign = res?.data ?? res;
        this.platforms = this.parsePlatforms(this.campaign?.['platforms']).map(platformLabel);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.message || 'Failed to load campaign';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Apply only for influencers, never on your own campaign, and once per campaign. */
  get canApply(): boolean {
    const open = !this.campaign?.['status'] || this.campaign['status'] === 'active';
    return this.isInfluencer && open && this.userId != null
      && this.campaign?.['creator_id'] !== this.userId && !this.existingStatus;
  }

  apply(): void {
    if (this.userId == null || this.applying) return;
    this.applying = true;
    this.influencerApi
      .campaignInfluencerControllerCreate({
        campaignId: this.data.id,
        userId: this.userId,
        status: CreateCampaignInfluencerDto.StatusEnum.Applied,
      })
      .subscribe({
        next: () => {
          this.applying = false;
          this.existingStatus = 'applied';
          this.toast.show('Application sent.', 'success');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.applying = false;
          this.toast.show(err?.error?.message ?? 'Could not submit your application.', 'error');
          this.cdr.detectChanges();
        },
      });
  }

  private loadViewer(): void {
    this.store.select(selectCurrentUser).pipe(take(1)).subscribe((user) => {
      this.userId = typeof user?.id === 'number' ? user.id : null;
      this.isInfluencer = hasCreativeProfile(user);
      if (this.userId == null || !this.isInfluencer) return;
      this.influencerApi.campaignInfluencerControllerFindByUser(this.userId).subscribe({
        next: (res) => {
          const mine = extractApiList(res).find((r) => Number(r?.['campaignId'] ?? r?.['campaign']?.['id']) === this.data.id);
          this.existingStatus = mine ? String(mine['status'] ?? 'applied') : null;
          this.cdr.detectChanges();
        },
      });
    });
  }

  close(): void {
    this.ref.close();
  }

  private parsePlatforms(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p) => {
      try {
        return JSON.parse(p);
      } catch {
        return [p];
      }
    });
  }
}
