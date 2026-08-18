import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type EscrowStage = 'sent' | 'negotiating' | 'active' | 'delivered' | 'released';

export interface EscrowStep {
  key: EscrowStage;
  step: number;
  label: string;
}

@Component({
  selector: 'app-escrow-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './escrow-progress.html',
  styleUrl: './escrow-progress.scss',
})
export class EscrowProgress {
  /** Current stage of the invite/negotiation deal. */
  @Input() currentStage: EscrowStage = 'sent';
  /** Amount of money currently held in escrow for this deal. */
  @Input() escrowAmount = 0;
  /** Currency symbol/prefix to display before the amount. */
  @Input() currencySymbol = '₦';

  readonly steps: EscrowStep[] = [
    { key: 'sent', step: 1, label: 'Sent' },
    { key: 'negotiating', step: 2, label: 'Negotiating' },
    { key: 'active', step: 3, label: 'Active' },
    { key: 'delivered', step: 4, label: 'Delivered' },
    { key: 'released', step: 5, label: 'Released' },
  ];

  get currentIndex(): number {
    return this.steps.findIndex((s) => s.key === this.currentStage);
  }

  isDone(index: number): boolean {
    return index < this.currentIndex;
  }

  isActive(index: number): boolean {
    return index === this.currentIndex;
  }

  formatAmount(value: number): string {
    return value.toLocaleString('en-NG');
  }
}
