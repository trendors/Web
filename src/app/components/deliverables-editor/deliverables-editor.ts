import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CampaignDeliverableService } from '../../core/api';
import { apiErrorMessage } from '../../core/services/escrow/escrow.service';
import { ToastService } from '../toast/toast.service';

interface Row {
  id: number;
  content_type: string;
  platform: string;
  quantity: number;
  rate_per_post: number;
}

/**
 * What a campaign asks creators to deliver. These are the opening offer for
 * everyone invited, so the brand can add, change or remove them here at any
 * time. Invites nobody has negotiated yet follow the changes; deals already
 * signed keep the terms they agreed to.
 */
@Component({
  selector: 'app-deliverables-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deliverables-editor.html',
  styleUrl: './deliverables-editor.scss',
})
export class DeliverablesEditor implements OnChanges {
  private readonly api = inject(CampaignDeliverableService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) campaignId!: number;

  readonly contentTypes = ['video', 'reel', 'story', 'post'];
  readonly platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'];

  readonly rows = signal<Row[]>([]);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly adding = signal(false);
  readonly editingId = signal<number | null>(null);

  draft = { content_type: 'video', platform: 'instagram', quantity: 1, rate_per_post: 0 };
  edit = { quantity: 1, rate_per_post: 0 };

  ngOnChanges(): void {
    this.load();
  }

  get total(): number {
    return Math.round(this.rows().reduce((sum, r) => sum + r.quantity * r.rate_per_post, 0) * 100) / 100;
  }

  get draftValid(): boolean {
    return Number.isInteger(Number(this.draft.quantity)) && Number(this.draft.quantity) >= 1 && Number(this.draft.rate_per_post) >= 0;
  }

  get editValid(): boolean {
    return Number.isInteger(Number(this.edit.quantity)) && Number(this.edit.quantity) >= 1 && Number(this.edit.rate_per_post) >= 0;
  }

  private async load(): Promise<void> {
    if (!this.campaignId) return;
    try {
      const res: any = await firstValueFrom(
        this.api.campaignDeliverableControllerFindByCampaign(this.campaignId, 'body', false, { transferCache: false }),
      );
      const list = (res?.data?.list ?? res?.list ?? []) as any[];
      this.rows.set(
        list.map((d) => ({
          id: d.id,
          content_type: String(d.content_type),
          platform: String(d.platform),
          quantity: Number(d.quantity) || 1,
          rate_per_post: Number(d.rate_per_post) || 0,
        })),
      );
      this.loaded.set(true);
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not load the deliverables.'), 'error');
    }
  }

  startEdit(row: Row): void {
    this.editingId.set(row.id);
    this.edit = { quantity: row.quantity, rate_per_post: row.rate_per_post };
  }

  async saveEdit(row: Row): Promise<void> {
    if (!this.editValid || this.busy()) return;
    await this.run(async () => {
      await firstValueFrom(
        this.api.campaignDeliverableControllerUpdate(row.id, {
          quantity: Number(this.edit.quantity),
          rate_per_post: Number(this.edit.rate_per_post),
        }),
      );
      this.editingId.set(null);
    }, 'Deliverable updated.');
  }

  async add(): Promise<void> {
    if (!this.draftValid || this.busy()) return;
    await this.run(async () => {
      await firstValueFrom(
        this.api.campaignDeliverableControllerCreate({
          campaignId: this.campaignId,
          content_type: this.draft.content_type as any,
          platform: this.draft.platform as any,
          quantity: Number(this.draft.quantity),
          rate_per_post: Number(this.draft.rate_per_post),
        }),
      );
      this.adding.set(false);
      this.draft = { content_type: 'video', platform: 'instagram', quantity: 1, rate_per_post: 0 };
    }, 'Deliverable added.');
  }

  async remove(row: Row): Promise<void> {
    if (this.busy()) return;
    await this.run(async () => {
      await firstValueFrom(this.api.campaignDeliverableControllerRemove(row.id));
    }, 'Deliverable removed.');
  }

  private async run(action: () => Promise<void>, done: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.toast.show(done, 'success');
      await this.load();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'That did not work. Please try again.'), 'error', 6000);
    } finally {
      this.busy.set(false);
    }
  }
}
