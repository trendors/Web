import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast/toast.service';
import { apiErrorMessage } from '../../core/services/escrow/escrow.service';
import { ChangeOrder, ChangeOrderService } from '../../core/services/escrow/change-order.service';

interface DraftLine {
  content_type: string;
  platform: string;
  title: string;
  quantity: number;
  rate: number;
}

const blank = (): DraftLine => ({ content_type: 'video', platform: 'instagram', title: '', quantity: 1, rate: 0 });

/**
 * Extra work and fee on a deal that is already signed. Either side proposes;
 * the other accepts or declines. Accepting adds the posts and raises the fee,
 * and the brand then tops up the escrow for the difference.
 */
@Component({
  selector: 'app-change-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-orders.html',
  styleUrl: './change-orders.scss',
})
export class ChangeOrders implements OnChanges {
  private readonly api = inject(ChangeOrderService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) assignmentId!: number;
  @Input() viewer: 'brand' | 'influencer' = 'brand';
  /** Change orders only exist on a signed, running deal. */
  @Input() assignmentStatus = '';
  @Output() changed = new EventEmitter<void>();

  readonly contentTypes = ['video', 'reel', 'story', 'post', 'other'];
  readonly platforms = ['instagram', 'tiktok', 'youtube', 'facebook', 'x'];

  readonly orders = signal<ChangeOrder[]>([]);
  readonly composing = signal(false);
  readonly busy = signal(false);
  draft: DraftLine[] = [blank()];
  message = '';

  ngOnChanges(): void {
    this.load();
  }

  get applicable(): boolean {
    return ['contracted', 'active'].includes(this.assignmentStatus.toLowerCase());
  }

  private load(): void {
    if (!this.assignmentId || !this.applicable) return;
    this.api.open(this.assignmentId).subscribe((list) => this.orders.set(list));
  }

  /** The other side's proposal is the one waiting on me. */
  mine(order: ChangeOrder): boolean {
    return order.proposed_by === this.viewer;
  }

  lineLabel(l: { title?: string | null; content_type?: string | null; platform?: string | null; quantity: number }): string {
    if (l.title) return `${l.quantity > 1 ? l.quantity + ' × ' : ''}${l.title}`;
    return `${l.quantity} × ${l.platform ?? ''} ${l.content_type ?? ''}`.trim();
  }

  get draftTotal(): number {
    return Math.round(this.draft.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0) * 100) / 100;
  }

  get draftValid(): boolean {
    return (
      this.draft.length > 0 &&
      this.draft.every(
        (l) => Number(l.quantity) >= 1 && Number(l.rate) >= 0 && (l.content_type !== 'other' || !!l.title.trim()),
      )
    );
  }

  addLine(): void {
    this.draft = [...this.draft, blank()];
  }

  removeLine(i: number): void {
    this.draft = this.draft.filter((_, idx) => idx !== i);
  }

  async submit(): Promise<void> {
    if (!this.draftValid || this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.propose(
        this.assignmentId,
        this.draft.map((l) => ({
          title: l.content_type === 'other' ? l.title.trim() : null,
          content_type: l.content_type === 'other' ? null : l.content_type,
          platform: l.content_type === 'other' ? null : l.platform,
          quantity: Number(l.quantity),
          rate: Number(l.rate),
        })),
        this.message,
      );
      this.toast.show('Change order sent. The other side can accept or decline it.', 'success');
      this.composing.set(false);
      this.draft = [blank()];
      this.message = '';
      this.load();
      this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not send the change order.'), 'error', 6000);
    } finally {
      this.busy.set(false);
    }
  }

  async answer(order: ChangeOrder, status: 'accepted' | 'declined'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.api.respond(order.id, status);
      this.toast.show(
        status === 'accepted'
          ? 'Change order accepted. The extra work and fee are now part of the deal.'
          : 'Change order declined.',
        status === 'accepted' ? 'success' : 'info',
        6000,
      );
      this.load();
      this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not answer the change order.'), 'error', 6000);
    } finally {
      this.busy.set(false);
    }
  }
}
