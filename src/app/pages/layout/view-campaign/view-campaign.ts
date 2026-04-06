import { Component, HostListener, inject, OnInit } from '@angular/core';
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
} from '../../../store/campaign/campaign.selector';
import { FormsModule } from '@angular/forms';
import { Campaign, CampaignStatus } from '../../../core/models/campaign/campaign.model';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { CampaignSummary } from '../campaign-summary/campaign-summary';
import { BehaviorSubject, combineLatest, map, tap } from 'rxjs';


 
export interface CampaignMetric {
  val: string;
  label: string;
}
 
export interface CampaignTimeline {
  done: boolean;
  text: string;
}
 

 
export interface PageStat {
  label: string;
  value: string;
  valueClass: string;
  change: string;
  changeClass: string;
}
 
export type FilterOption = 'all' | CampaignStatus;

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
    CommonModule, FormsModule,
    
  ],
  templateUrl: './view-campaign.html',
  styleUrl: './view-campaign.scss',
})
export class ViewCampaign implements OnInit {
  private store = inject(Store);
  private router = inject(Router);

  campaigns$ = this.store.select(selectCampaignList);
  isLoading$ = this.store.select(selectCampaignLoading);
  error$ = this.store.select(selectCampaignError);
   readonly dialog = inject(MatDialog);

   
  searchQuery = '';
  activeFilter: FilterOption = 'all';
  selectedCampaign: Campaign | null = null;
  isModalOpen = false;
 
  filters: { label: string; value: FilterOption }[] = [
    { label: 'All',    value: 'all'    },
    { label: 'Active', value: 'invite_only' },
    { label: 'Ended',  value: 'application'  },
  ];
 
  stats: PageStat[] = [
    { label: 'Total Campaigns', value: '24',   valueClass: '',       change: '↑ 4 this month',          changeClass: 'up'  },
    { label: 'Active Now',      value: '9',    valueClass: 'accent', change: 'Running live',             changeClass: ''    },
    { label: 'Total Reach',     value: '2.4M', valueClass: '',       change: '↑ 18% vs last month',      changeClass: 'up'  },
    { label: 'Avg. Engagement', value: '6.8%', valueClass: 'amber',  change: 'Across all campaigns',     changeClass: ''    },
  ];
 

 
  get filteredCampaigns(): any[] {
     return [];
    // return this.campaigns.filter(c => {
    //   const matchesFilter = this.activeFilter === 'all' || c.status === this.activeFilter;
    //   const matchesSearch = c.name.toLowerCase().includes(this.searchQuery.toLowerCase());
    //   return matchesFilter && matchesSearch;
    // });
  }

  // filteredCampaigns$ = combineLatest([this.campaigns$, this.search$, this.monthFilter$]).pipe(
  //   map(([campaigns, search, months]) => this.applyFilters(campaigns, search, months)),
  //   tap(list => console.log('Filtered Campaigns:', list))
  // );
  ngOnInit() {
    const user$ = this.store.select(selectCurrentUser);
    user$.subscribe((user) => {
      if (user?.id) {
        this.store.dispatch(CampaignActions.loadCampaigns({ userId: user.id }));
      }
    });
  }

   setFilter(value: FilterOption): void {
    this.activeFilter = value;
  }

  getPlatforms(raw: string[]): string[] {
  try {
    return raw.flatMap(p => JSON.parse(p));
  } catch {
    return raw;
  }
}
 
  openModal(campaign: any): void {
    // this.selectedCampaign = campaign;
    // this.isModalOpen = true;
    // document.body.style.overflow = 'hidden';
    console.log('Opening modal for campaign:', campaign);
        const dialogRef = this.dialog.open(CampaignSummary, {
          data: campaign
        });

    dialogRef.afterClosed().subscribe(result => {
      console.log(`Dialog result: ${result}`);
    });

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
    open:   'status-active',
    closed: 'status-ended',
    draft:  'status-draft',
    paused: 'status-paused',
  };
  return map[access] ?? 'status-draft';
}
 
  capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
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
