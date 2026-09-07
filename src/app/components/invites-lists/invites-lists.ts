import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { InviteNegotiate } from '../invite-negotiate/invite-negotiate';

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
  private dialog = inject(MatDialog);


  constructor() {
    console.log(this.invites, 'InvitesLists component initialized');
  }
 

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
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  sorted(): any[] {
    return [...this.invites].sort(
      (a, b) => Number(this.needsAction(b.status)) - Number(this.needsAction(a.status))
    );
  }


    openInviteDetail(invite: any): void {
      const dialogRef = this.dialog.open(InviteNegotiate, {
        data:  invite,
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Handle the result from the dialog if needed
        }
      });
    }
}
