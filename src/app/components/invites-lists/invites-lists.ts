import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-invites-lists',
  imports: [CommonModule],
  templateUrl: './invites-lists.html',
  styleUrl: './invites-lists.scss',
})
export class InvitesLists {
  @Input() invites: any[] = [];
  @Input() selectedId: string | null = null;
 @Output() selectInvite = new EventEmitter<string>();
  /** Accept/decline for invitation entities (they have no negotiation thread). */
  @Output() respond = new EventEmitter<{ id: number; accept: boolean }>();
  private router = inject(Router);


  needsAction(status: any): boolean {
    return status === 'awaiting_response' || status === 'negotiating';
  }

  statusLabel(status: any): any {
    switch (status) {
      case 'awaiting_response': return 'Respond to invite';
      case 'negotiating': return 'Your turn to reply';
      case 'active': return 'Active deal';
      case 'delivered': return 'Delivered — verifying';
      case 'released': return 'Paid';
      case 'declined': return 'Declined';
    }
  }

  statusClass(status: any): any {
    switch (status) {
      case 'awaiting_response': return 'badge-action';
      case 'negotiating': return 'badge-action';
      case 'active': return 'badge-live';
      case 'delivered': return 'badge-progress';
      case 'released': return 'badge-live';
      case 'declined': return 'badge-declined';
    }
  }

  initials(name: string): string {
    return (name ?? '').split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
  }

  sorted(): any[] {
    return [...this.invites].sort(
      (a, b) => Number(this.needsAction(b.status)) - Number(this.needsAction(a.status))
    );
  }


  // route to InviteNegotiate
  openInviteDetail(invite: any): void {
    // Only campaign assignments have a negotiation thread; invitation entities
    // are answered inline with Accept/Decline.
    if (invite?.kind !== 'assignment' || invite.assignmentId == null) return;
    this.router.navigate(['/home/invite-negotiate', invite.assignmentId], {
      queryParams: { campaignId: invite.campaign?.id ?? null },
    });
  }
}
