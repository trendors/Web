import { DatePipe, AsyncPipe } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Observable, switchMap } from 'rxjs';
import { Campaign } from '../../../core/models/campaign/campaign.model';
import { selectCampaignList } from '../../../store/campaign/campaign.selector';
import { EscrowProgress, EscrowStage } from '../../../components/escrow-progress/escrow-progress';
import { Negotiation } from "../../../components/negotiation/negotiation";

export interface Applicant {
  id: number;
  name: string;
  followerCount: number;
  tier: string;
  socialMedia: string;
  status: 'pending' | 'accepted' | 'declined';
}

@Component({
  selector: 'app-campaign-summary',
  imports: [DatePipe, AsyncPipe, EscrowProgress, Negotiation],
  templateUrl: './campaign-summary.html',
  styleUrl: './campaign-summary.scss',
})
export class CampaignSummary {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);

  data$: Observable<Campaign | undefined> = this.route.paramMap.pipe(
    map((params) => Number(params.get('id'))),
    switchMap((id) =>
      this.store.select(selectCampaignList).pipe(map((campaigns) => campaigns.find((c) => c.id === id))),
    ),
  );

  // Hardcoded placeholder applicants until real applicant data is wired up.
  applicants: Applicant[] = [
    { id: 1, name: 'Ada Okafor', followerCount: 4200, tier: 'Nano', socialMedia: 'Instagram', status: 'pending' },
    { id: 2, name: 'Chidi Umeh', followerCount: 18500, tier: 'Micro', socialMedia: 'TikTok', status: 'pending' },
    { id: 3, name: 'Fatima Bello', followerCount: 75000, tier: 'Mid', socialMedia: 'X (Twitter)', status: 'accepted' },
    { id: 4, name: 'Emeka Nwosu', followerCount: 250000, tier: 'Macro', socialMedia: 'YouTube', status: 'pending' },
    { id: 5, name: 'Zainab Yusuf', followerCount: 9800, tier: 'Nano', socialMedia: 'Instagram', status: 'declined' },
  ];

  // Hardcoded placeholder escrow/deal progress until real negotiation data is wired up.
  getEscrowStage(campaign: Campaign): EscrowStage {
    const stages: EscrowStage[] = ['sent', 'negotiating', 'active', 'delivered', 'released'];
    return stages[campaign.id % stages.length];
  }

  getEscrowAmount(campaign: Campaign): number {
    return 50000 + ((campaign.id * 8317) % 450000);
  }


  getPlatforms(raw: string[]): string[] {
    try {
      return raw.flatMap((p) => JSON.parse(p));
    } catch {
      return raw;
    }
  }

  openNewCampaign(): void {
    this.router.navigate(['/home/create-campaign']);
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
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.goBack();
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew() {
    this.router.navigate(['/home/create-campaign']);
  }

  goBack(): void {
    this.router.navigate(['/home/view-campaign']);
  }

  acceptApplicant(applicant: Applicant): void {
    applicant.status = 'accepted';
  }

  declineApplicant(applicant: Applicant): void {
    applicant.status = 'declined';
  }

  formatFollowers(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return String(count);
  }
}

