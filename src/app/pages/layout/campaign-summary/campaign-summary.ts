import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogActions, MatDialogRef } from '@angular/material/dialog';
import { FilterOption, PageStat } from '../view-campaign/view-campaign';

@Component({
  selector: 'app-campaign-summary',
  imports: [TitleCasePipe,
    DatePipe, MatDialogContent, MatDialogActions],
  templateUrl: './campaign-summary.html',
  styleUrl: './campaign-summary.scss',
})
export class CampaignSummary {
  data = inject(MAT_DIALOG_DATA);

constructor(private dialogRef: MatDialogRef<CampaignSummary>) {}



  getPlatforms(raw: string[]): string[] {
    try {
      return raw.flatMap(p => JSON.parse(p));
    } catch {
      return raw;
    }
  }





  openNewCampaign(): void {
    // TODO: navigate to new campaign creation route
    alert('New Campaign flow coming soon!');
  }

  statusClass(access: string): string {
    const map: Record<string, string> = {
      open: 'status-active',
      closed: 'status-ended',
      draft: 'status-draft',
      paused: 'status-paused',
    };
    return map[access] ?? 'status-draft';
  }

  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    // if (this.isModalOpen) this.closeModal();
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew() {
    console.log('Navigate to create campaign');
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
