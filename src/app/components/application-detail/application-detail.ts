import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ChangeDetectorRef, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CampaignInfluencerPostService, CampaignOfferService } from '../../core/api';
import { extractApiList } from '../../core/utils/api-response';

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

interface DeliverableRow {
  /** Index into the agreed offer's lines — offer lines have no id of their own. */
  id: number;
  contentType: string;
  platform: string;
  quantity: number;
  ratePerPost: number;
  posts: Record<string, any>[];
}

@Component({
  selector: 'app-application-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.scss',
})
export class ApplicationDetail implements OnInit {
  private offerApi = inject(CampaignOfferService);
  private postApi = inject(CampaignInfluencerPostService);
  private cdr = inject(ChangeDetectorRef);

  @Output() close = new EventEmitter<void>();

  readonly dialogRef = inject(MatDialogRef<ApplicationDetail>);
  readonly application = inject<any>(MAT_DIALOG_DATA);

  deliverables: DeliverableRow[] = [];
  deliverablesLoading = false;
  deliverablesError: string | null = null;

  /** Deliverable id whose "add link" input is currently open. */
  activeDeliverableId: number | null = null;
  linkInput = '';
  publishLoading = false;
  publishError: string | null = null;

  ngOnInit(): void {
    this.fetchDeliverables();
  }

  private get assignmentId(): number | null {
    const id = Number(this.application?.assignmentId ?? this.application?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  /** Loads the agreed deliverables (GET /campaign-offer/assignment/{id}/agreed) and the posts already submitted against them. */
  fetchDeliverables(): void {
    const id = this.assignmentId;
    if (!id) return;

    this.deliverablesLoading = true;
    this.deliverablesError = null;

    forkJoin({
      agreedRes: this.offerApi.campaignOfferControllerAgreed(id, 'body', false, { transferCache: false }).pipe(
        catchError((err: any) => {
          this.deliverablesLoading = false;
          this.deliverablesError = err?.message || 'Failed to load deliverables';
          this.cdr.markForCheck();
          return of(null);
        })
      ),
      // Submissions are secondary: if they fail, still show the deliverables
      // (with nothing submitted) instead of an empty dialog.
      postsRes: this.postApi.campaignInfluencerPostControllerFindByAssignment(id, 'body', false, { transferCache: false }).pipe(
        catchError(() => of({ data: [] })),
      ),
    }).subscribe((both) => {
      if (!both.agreedRes) return;
      const agreedData = (both.agreedRes as any)?.data ?? both.agreedRes;
      const agreed = Array.isArray(agreedData) ? agreedData[0] : agreedData;
      const lines = ((agreed?.lines ?? []) as Record<string, any>[]).filter((d) => !!d);
      const posts = (extractApiList(both.postsRes) as Record<string, any>[]).filter((p) => !!p);
      this.deliverables = lines.map((d, index) => {
        const contentType = String(d['content_type'] ?? 'post');
        const platform = String(d['platform'] ?? '—');
        return {
          id: index,
          contentType,
          platform,
          quantity: Number(d['quantity'] ?? 0) || 0,
          ratePerPost: Number(d['rate'] ?? d['rate_per_post'] ?? 0) || 0,
          posts: posts.filter((p) => p['content_type'] === contentType && p['platform'] === platform),
        };
      });
      this.deliverablesLoading = false;
      this.cdr.markForCheck();
    });
  }

  remainingSlots(d: DeliverableRow): number {
    return Math.max(0, d.quantity - d.posts.length);
  }

  startAttend(deliverableId: number): void {
    this.activeDeliverableId = deliverableId;
    this.linkInput = '';
    this.publishError = null;
  }

  cancelAttend(): void {
    this.activeDeliverableId = null;
    this.linkInput = '';
    this.publishError = null;
  }

  publish(d: DeliverableRow): void {
    const assignmentId = this.assignmentId;
    const link = this.linkInput.trim();
    if (!assignmentId || !link) return;
    if (this.remainingSlots(d) <= 0) {
      this.publishError = 'All agreed posts for this deliverable are already submitted.';
      return;
    }
    if (!isHttpUrl(link)) {
      this.publishError = 'Enter the full link to your post, starting with https://';
      return;
    }

    this.publishLoading = true;
    this.publishError = null;

    this.postApi.campaignInfluencerPostControllerCreate({
      campaignInfluencerId: assignmentId,
      content_type: d.contentType as any,
      platform: d.platform as any,
      post_url: link,
      status: 'submitted' as any,
    }).subscribe({
      next: () => {
        this.publishLoading = false;
        this.activeDeliverableId = null;
        this.linkInput = '';
        this.fetchDeliverables();
      },
      error: (err) => {
        this.publishLoading = false;
        this.publishError = err?.message || 'Could not publish link';
        this.cdr.markForCheck();
      },
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
