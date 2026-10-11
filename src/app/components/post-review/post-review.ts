import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CampaignInfluencerPostService, UpdateCampaignInfluencerPostDto } from '../../core/api';
import { apiErrorMessage, EscrowService } from '../../core/services/escrow/escrow.service';
import { ToastService } from '../toast/toast.service';

type Mode = 'idle' | 'confirm-approve' | 'changes';

/**
 * The brand's review of one submitted post: approve it (which pays it out of
 * escrow) or send it back with a note. The server enforces the revision limit
 * and any dispute freeze; its message is shown as is.
 */
@Component({
  selector: 'app-post-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-review.html',
  styleUrl: './post-review.scss',
})
export class PostReview {
  private readonly postApi = inject(CampaignInfluencerPostService);
  private readonly escrowApi = inject(EscrowService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) postId!: number;
  @Input() status = '';
  @Input() paymentStatus = 'pending';
  @Input() payout = 0;
  /** Whether the assignment has funded escrow (approving then pays out). */
  @Input() escrowFunded = false;
  @Output() changed = new EventEmitter<void>();

  readonly mode = signal<Mode>('idle');
  readonly busy = signal(false);
  note = '';

  /** Only work waiting on the brand, and not yet paid, can be reviewed. */
  get reviewable(): boolean {
    return (
      ['submitted', 'published'].includes(this.status.toLowerCase()) &&
      this.paymentStatus.toLowerCase() !== 'paid'
    );
  }

  async approve(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await new Promise<void>((resolve, reject) =>
        this.postApi
          .campaignInfluencerPostControllerUpdate(this.postId, {
            status: UpdateCampaignInfluencerPostDto.StatusEnum.Approved,
          })
          .subscribe({ next: () => resolve(), error: reject }),
      );
      this.toast.show(this.escrowFunded && this.payout > 0 ? 'Approved and paid out.' : 'Approved.', 'success');
      this.mode.set('idle');
      this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not approve this post.'), 'error', 6000);
    } finally {
      this.busy.set(false);
    }
  }

  async sendBack(): Promise<void> {
    const note = this.note.trim();
    if (!note || this.busy()) return;
    this.busy.set(true);
    try {
      await this.escrowApi.requestChanges(this.postId, note);
      this.toast.show('Sent back for changes.', 'info');
      this.note = '';
      this.mode.set('idle');
      this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not send this back.'), 'error', 6000);
    } finally {
      this.busy.set(false);
    }
  }
}
