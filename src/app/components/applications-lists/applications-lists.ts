import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationDetail } from '../application-detail/application-detail';
@Component({
  selector: 'app-applications-lists',
  imports: [CommonModule],
  templateUrl: './applications-lists.html',
  styleUrl: './applications-lists.scss',
})
export class ApplicationsLists {
 @Input() applications: any[] = [
  
 ];
  @Input() selectedId: string | null = null;
  @Output() selectApplication = new EventEmitter<string>();

    private dialog = inject(MatDialog);

  select(id: string): void {
    this.selectApplication.emit(id);
  }

  needsAction(status: any): boolean {
    return status === 'accepted';
  }

  statusLabel(status: any): any {
    switch (status) {
      case 'pending': return 'Pending review';
      case 'accepted': return 'Accepted — post now';
      case 'posted': return 'Verifying';
      case 'paid': return 'Paid';
      case 'declined': return 'Declined';
    }
  }

  statusClass(status: any): any {
    switch (status) {
      case 'pending': return 'badge-progress';
      case 'accepted': return 'badge-action';
      case 'posted': return 'badge-progress';
      case 'paid': return 'badge-live';
      case 'declined': return 'badge-declined';
    }
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  sorted(): any[] {
    return [...this.applications].sort(
      (a, b) => Number(this.needsAction(b.status)) - Number(this.needsAction(a.status))
    );
  }

  openApplicationDetail(application: any): void {
    const dialogRef = this.dialog.open(ApplicationDetail, {
      data:  application ,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle the result from the dialog if needed
      }
    });
  }
}
