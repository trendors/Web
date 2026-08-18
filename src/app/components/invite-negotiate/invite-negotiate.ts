import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Negotiation } from "../negotiation/negotiation";

@Component({
  selector: 'app-invite-negotiate',
  imports: [CommonModule, FormsModule, Negotiation],
  templateUrl: './invite-negotiate.html',
  styleUrl: './invite-negotiate.scss',
})
export class InviteNegotiate {
  @Output() close = new EventEmitter<void>();
  @Output() respond = new EventEmitter<{ id: string; action: 'accept' | 'decline' }>();
  @Output() counter = new EventEmitter<{ id: string; amount: number; note: string }>();


  readonly dialogRef = inject(MatDialogRef<InviteNegotiate>);
  readonly invite = inject<any>(MAT_DIALOG_DATA);

  counterAmount: number | null = null;
  counterNote = '';

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  get isFinalRound(): boolean {
    return !!this.invite && this.invite.round >= this.invite.maxRounds;
  }

  onAccept(): void {
    if (!this.invite) return;
    this.respond.emit({ id: this.invite.id, action: 'accept' });
  }

  onDecline(): void {
    if (!this.invite) return;
    this.respond.emit({ id: this.invite.id, action: 'decline' });
  }

  onCounter(): void {
    if (!this.invite || !this.counterAmount || this.isFinalRound) return;
    this.counter.emit({ id: this.invite.id, amount: this.counterAmount, note: this.counterNote });
    this.counterAmount = null;
    this.counterNote = '';
  }
}
