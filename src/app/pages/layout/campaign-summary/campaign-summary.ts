import { DatePipe, AsyncPipe, NgSwitchDefault, NgSwitch, NgSwitchCase, CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';
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
  imports: [DatePipe, AsyncPipe, EscrowProgress, Negotiation,  NgSwitch,
    NgSwitchCase, CommonModule,
    NgSwitchDefault],
  templateUrl: './campaign-summary.html',
  styleUrl: './campaign-summary.scss',
})
export class CampaignSummary {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }


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

  // Active tab for switching between Influencers and Invites & Applications
  activeTab: 'influencers' | 'invites' = 'influencers';

  // Filter dropdown state
  isFilterOpen = false;
  selectedFilter = 'All Statuses';

  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
    this.isFilterOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-dropdown')) {
      this.isFilterOpen = false;
    }
  }

  // Hardcoded placeholder invites/applications until real data is wired up.
  invites: {
    id: number;
    name: string;
    handle: string;
    avatar: string;
    platform: string;
    status: 'applied' | 'invited' | 'accepted' | 'declined';
    statusClass: string;
  }[] = [
    {
      id: 1,
      name: 'Priya Sharma',
      handle: '@priya.sharma',
      avatar: 'https://i.pravatar.cc/80?img=33',
      platform: 'Instagram',
      status: 'applied',
      statusClass: 'amber'
    },
    {
      id: 2,
      name: 'Marcus Johnson',
      handle: '@marcus.j',
      avatar: 'https://i.pravatar.cc/80?img=52',
      platform: 'TikTok',
      status: 'invited',
      statusClass: 'blue'
    },
    {
      id: 3,
      name: 'Lena Kowalski',
      handle: '@lena.k',
      avatar: 'https://i.pravatar.cc/80?img=26',
      platform: 'YouTube',
      status: 'accepted',
      statusClass: 'green'
    },
    {
      id: 4,
      name: 'Omar Hassan',
      handle: '@omar.h',
      avatar: 'https://i.pravatar.cc/80?img=61',
      platform: 'X',
      status: 'applied',
      statusClass: 'amber'
    },
    {
      id: 5,
      name: 'Sophie Laurent',
      handle: '@sophie.l',
      avatar: 'https://i.pravatar.cc/80?img=44',
      platform: 'Instagram',
      status: 'declined',
      statusClass: 'red'
    }
  ];

  influencers: {
    name: string;
    handle: string;
    avatar: string;
    platform: string;
    status: string;
    statusClass: string;
    done: number;
    total: number;
  }[] = [
    {
      name: 'Maya Chen',
      handle: '@maya.glows',
      avatar: 'https://i.pravatar.cc/80?img=47',
      platform: 'Instagram',
      status: 'Active',
      statusClass: 'blue',
      done: 2,
      total: 2
    },
    {
      name: 'Jordan Blake',
      handle: '@jordanblake',
      avatar: 'https://i.pravatar.cc/80?img=13',
      platform: 'TikTok',
      status: 'Active',
      statusClass: 'blue',
      done: 1,
      total: 3
    },
    {
      name: 'Sofia Reyes',
      handle: '@sofiareyes',
      avatar: 'https://i.pravatar.cc/80?img=32',
      platform: 'YouTube',
      status: 'Completed',
      statusClass: 'green',
      done: 2,
      total: 2
    },
    {
      name: 'Daniel Okafor',
      handle: '@daniel.creates',
      avatar: 'https://i.pravatar.cc/80?img=51',
      platform: 'Instagram',
      status: 'Negotiating',
      statusClass: 'amber',
      done: 0,
      total: 2
    },
    {
      name: 'Aisha Khan',
      handle: '@aisha.k',
      avatar: 'https://i.pravatar.cc/80?img=25',
      platform: 'TikTok',
      status: 'Pending',
      statusClass: 'amber',
      done: 0,
      total: 2
    },
    {
      name: 'Liam Carter',
      handle: '@liamcarter',
      avatar: 'https://i.pravatar.cc/80?img=14',
      platform: 'YouTube',
      status: 'Paid',
      statusClass: 'green',
      done: 3,
      total: 3
    },
    {
      name: 'Yuki Tanaka',
      handle: '@yuki.t',
      avatar: 'https://i.pravatar.cc/80?img=45',
      platform: 'X',
      status: 'Rejected',
      statusClass: 'red',
      done: 1,
      total: 2
    },
    {
      name: 'Amara Diallo',
      handle: '@amara.d',
      avatar: 'https://i.pravatar.cc/80?img=60',
      platform: 'Instagram',
      status: 'Completed',
      statusClass: 'green',
      done: 2,
      total: 2
    }
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


  acceptApplicant(applicant: Applicant): void {
    applicant.status = 'accepted';
  }

  declineApplicant(applicant: Applicant): void {
    applicant.status = 'declined';
  }

  setActiveTab(tab: 'influencers' | 'invites'): void {
    this.activeTab = tab;
  }

  acceptInvite(invite: any): void {
    invite.status = 'accepted';
    invite.statusClass = 'green';
  }

  negotiateWith(invite: any): void {
    // Open negotiation modal or navigate to negotiation page
    console.log('Negotiate with:', invite.name);
    // TODO: Implement negotiation flow
  }

  declineInvite(invite: any): void {
    invite.status = 'declined';
    invite.statusClass = 'red';
  }

  viewInfluencerMetrics(influencer: any): void {
    this.router.navigate(['/home/view-influencer-metrics', influencer.id || 1]);
  }

  viewMore(invite: any): void {
    this.router.navigate(['/home/view-pending-influencer-metrics', invite.id || 1]);
  }

  formatFollowers(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return String(count);
  }
}

