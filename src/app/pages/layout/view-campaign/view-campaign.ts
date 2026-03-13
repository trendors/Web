import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe, NgClass, TitleCasePipe } from '@angular/common';
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
} from '../../../store/campaign/campaign.selector';
import { BehaviorSubject, combineLatest, map, tap } from 'rxjs';
import { Campaign } from '../../../core/models/campaign/campaign.model';

@Component({
  selector: 'app-view-campaign',
  imports: [
    AsyncPipe,
    TitleCasePipe,
    DatePipe,
    NgClass,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './view-campaign.html',
  styleUrl: './view-campaign.scss',
})
export class ViewCampaign implements OnInit {
  private store = inject(Store);
  private search$ = new BehaviorSubject<string>('');
  private monthFilter$ = new BehaviorSubject<number>(0);

  campaigns$ = this.store.select(selectCampaignList);
  isLoading$ = this.store.select(selectCampaignLoading);
  error$ = this.store.select(selectCampaignError);

  filteredCampaigns$ = combineLatest([this.campaigns$, this.search$, this.monthFilter$]).pipe(
    map(([campaigns, search, months]) => this.applyFilters(campaigns, search, months)),
    tap(list => console.log('Filtered Campaigns:', list))
  );
  ngOnInit() {
    const user$ = this.store.select(selectCurrentUser);
    user$.subscribe((user) => {
      if (user?.id) {
        this.store.dispatch(CampaignActions.loadCampaigns({ userId: user.id }));
      }
    });
  }

  applyFilters(campaigns: Campaign[], search: string, monthFilter: number): Campaign[] {
    let filtered = campaigns;

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(term));
    }

    console.log('applying filters', { search, monthFilter });

    if (monthFilter > 0) {
      const now = new Date();
      filtered = filtered.filter((c) => {
        const created = new Date(c.createdAt);
        const diffMonths =
          (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
        return diffMonths <= monthFilter;
      });
    }

    return filtered;
  }

  updateSearch(value: string) {
    this.search$.next(value);
  }

  updateMonthFilter(value: number) {
    this.monthFilter$.next(value);
  }

  getBadgedClass(pkg: string): string {
    return pkg?.toLowerCase() === 'paid' ? 'paid' : 'free';
  }

  createNew() {
    console.log('Navigate to create campaign');
  }

  trackById(_i: number, campaign: Campaign) {
    return campaign.id;
  }
}
