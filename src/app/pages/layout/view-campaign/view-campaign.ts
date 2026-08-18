import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule, DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { CampaignActions } from '../../../store/campaign/campaign.action';
import {
  selectCampaignList,
  selectCampaignLoading,
  selectCampaignError,
  selectCampaignStats,
} from '../../../store/campaign/campaign.selector';
import { FormsModule } from '@angular/forms';
import {
  Campaign,
  CampaignStatus,
  FilterOption,
} from '../../../core/models/campaign/campaign.model';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil, tap } from 'rxjs';

export interface CampaignMetric {
  val: string;
  label: string;
}

export interface CampaignTimeline {
  done: boolean;
  text: string;
}

@Component({
  selector: 'app-view-campaign',
  imports: [
    AsyncPipe,
    NgClass,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './view-campaign.html',
  styleUrl: './view-campaign.scss',
})
export class ViewCampaign implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  campaigns$ = this.store.select(selectCampaignList);
  isLoading$ = this.store.select(selectCampaignLoading);
  error$ = this.store.select(selectCampaignError);
  stats$ = this.store.select(selectCampaignStats);
  filteredCampaigns$ = new Observable<Campaign[]>();

  searchQuery = '';
  activeFilter: FilterOption = 'all';
  private searchQuery$ = new BehaviorSubject<string>('');
  private activeFilter$ = new BehaviorSubject<FilterOption>('all');
  selectedCampaign: Campaign | null = null;
  isModalOpen = false;

  filters: { label: string; value: FilterOption }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'invite_only' },
    { label: 'Ended', value: 'application' },
  ];

  constructor() {
    this.filteredCampaigns$ = combineLatest([
      this.campaigns$,
      this.searchQuery$,
      this.activeFilter$,
    ]).pipe(map(([campaigns, search, filter]) => this.filterCampaigns(campaigns, search, filter)));
  }

  ngOnInit() {
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user?.id) {
          this.store.dispatch(CampaignActions.loadCampaigns({ userId: user.id }));
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(value: FilterOption): void {
    this.activeFilter = value;
    this.activeFilter$.next(value);
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchQuery$.next(value);
  }

  private filterCampaigns(campaigns: Campaign[], search: string, filter: FilterOption): Campaign[] {
    const normalizedSearch = search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesFilter = filter === 'all' || campaign.access === filter;
      const matchesSearch =
        !normalizedSearch ||
        campaign.name.toLowerCase().includes(normalizedSearch) ||
        campaign.description.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }

  getPlatforms(raw: string[]): string[] {
    try {
      return raw.flatMap((value) => {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      });
    } catch {
      return raw;
    }
  }

  openModal(campaign: Campaign): void {
    this.router.navigate(['/home/view-campaign', campaign.id]);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedCampaign = null;
    document.body.style.overflow = '';
  }

  closeModalOutside(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
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

  // Hardcoded placeholder click stats for open campaigns until real analytics are wired up.
  getTotalClicks(campaign: Campaign): number {
    // deterministic pseudo-random-ish number based on campaign id so it stays stable per render
    return 1000 + ((campaign.id * 137) % 9000);
  }

  getTodayClicks(campaign: Campaign): number {
    return 20 + ((campaign.id * 17) % 180);
  }

  // Hardcoded placeholder application stats until real applicant data is wired up.
  getApplicantsCount(campaign: Campaign): number {
    return 5 + ((campaign.id * 23) % 95);
  }

  getPendingReviewCount(campaign: Campaign): number {
    const applicants = this.getApplicantsCount(campaign);
    const pending = 1 + ((campaign.id * 11) % 20);
    return Math.min(pending, applicants);
  }

  // Hardcoded placeholder negotiation stats until real negotiation data is wired up.
  getNegotiationRound(campaign: Campaign): number {
    return 1 + ((campaign.id * 7) % 4);
  }

  getAwaitingReplyCount(campaign: Campaign): number {
    return 1 + ((campaign.id * 13) % 10);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isModalOpen) this.closeModal();
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew(): void {
    this.router.navigate(['/home/create-campaign']);
  }

  trackById(_i: number, campaign: Campaign) {
    return campaign.id;
  }
}
