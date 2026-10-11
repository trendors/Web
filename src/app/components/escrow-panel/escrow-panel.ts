import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast/toast.service';
import { apiErrorMessage, EscrowService, EscrowView } from '../../core/services/escrow/escrow.service';

/**
 * The money side of one assignment, for the brand or the influencer. Shows
 * whether the fee is secured, what has been paid out, and lets either side
 * open a dispute; the brand funds it from here.
 */
@Component({
  selector: 'app-escrow-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escrow-panel.html',
  styleUrl: './escrow-panel.scss',
})
export class EscrowPanel implements OnChanges {
  private readonly escrowApi = inject(EscrowService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) assignmentId!: number;
  @Input() viewer: 'brand' | 'influencer' = 'brand';
  /** The agreed fee from the accepted offer (assignment.fee_agreed). */
  @Input() feeAgreed = 0;
  /** Assignment status, e.g. contracted / active. */
  @Input() assignmentStatus = '';
  /** Tell the parent something changed so it can refresh its own data. */
  @Output() changed = new EventEmitter<void>();
  /** Whether an escrow holds this assignment's fee; fires after every load. */
  @Output() funded = new EventEmitter<boolean>();

  readonly escrow = signal<EscrowView | null>(null);
  readonly loaded = signal(false);
  readonly busy = signal<'fund' | 'dispute' | null>(null);
  readonly disputing = signal(false);
  reason = '';

  ngOnChanges(): void {
    this.load();
  }

  private load(): void {
    if (!this.assignmentId) return;
    this.escrowApi.get(this.assignmentId).subscribe((e) => {
      this.escrow.set(e);
      this.loaded.set(true);
      this.funded.emit(!!e);
    });
  }

  /** The fee is owed but not secured yet. */
  get needsFunding(): boolean {
    return (
      this.loaded() &&
      !this.escrow() &&
      this.feeAgreed > 0 &&
      ['contracted', 'active'].includes(this.assignmentStatus.toLowerCase())
    );
  }

  /** The fee grew after funding (a change order): the escrow holds less than is owed. */
  get topUp(): number {
    const e = this.escrow();
    if (!e || this.feeAgreed <= 0) return 0;
    return Math.max(0, Math.round((this.feeAgreed - e.amount) * 100) / 100);
  }

  get statusLabel(): string {
    switch (this.escrow()?.status) {
      case 'held': return 'Secured';
      case 'partially_released': return 'Partly paid out';
      case 'released': return 'Paid out';
      case 'refunded': return 'Refunded';
      case 'disputed': return 'In dispute';
      default: return '';
    }
  }

  get statusClass(): string {
    switch (this.escrow()?.status) {
      case 'held':
      case 'partially_released':
      case 'released':
        return 'green';
      case 'disputed':
        return 'red';
      default:
        return 'amber';
    }
  }

  get canDispute(): boolean {
    const e = this.escrow();
    return !!e && e.held > 0 && e.status !== 'disputed';
  }

  async fund(): Promise<void> {
    if (this.busy()) return;
    this.busy.set('fund');
    try {
      const outcome = await this.escrowApi.fund(this.assignmentId, this.feeAgreed);
      if (outcome === 'funded') this.toast.show('Fee secured in escrow. Work can start.', 'success');
      else if (outcome === 'pending') this.toast.show("We're confirming your payment. This will update as soon as it lands.", 'info', 8000);
      else this.toast.show('Payment cancelled. Nothing was charged.', 'info');
      this.load();
      if (outcome !== 'cancelled') this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, err?.message || 'Could not fund the escrow.'), 'error');
    } finally {
      this.busy.set(null);
    }
  }

  async submitDispute(): Promise<void> {
    const reason = this.reason.trim();
    if (!reason || this.busy()) return;
    this.busy.set('dispute');
    try {
      await this.escrowApi.dispute(this.assignmentId, reason);
      this.toast.show('Dispute opened. The money is frozen until an admin decides.', 'info', 6000);
      this.disputing.set(false);
      this.reason = '';
      this.load();
      this.changed.emit();
    } catch (err: any) {
      this.toast.show(apiErrorMessage(err, 'Could not open the dispute.'), 'error');
    } finally {
      this.busy.set(null);
    }
  }
}
