import { Component, inject } from '@angular/core';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { first, firstValueFrom, map, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { selectFilteredShares, selectTotals } from '../../store/shares/shares.selector';
import { SharesActions } from '../../store/shares/shares.action';
import { ActiveProfileService } from '../../core/services/activeprofile.service';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule, AsyncPipe],
  templateUrl: './user-info-card.html',
  styleUrls: ['./user-info-card.scss'],
})
export class UserInfoCard {
  private store = inject(Store);
  private router = inject(Router);
  user$ = this.store.select(selectCurrentUser);


  shares$!: Observable<Share[]>;
  totals$!: Observable<{ totalShares: number; totalEarned: number; pendingCount: number }>;


  onlyPaid: boolean = false;
  selectedCats: Set<string> = new Set();

  // some.component.ts
  private profileService = inject(ActiveProfileService);
  activeProfile = this.profileService.activeProfile;       // signal
  hasBothProfiles = this.profileService.hasBothProfiles;    // computed signal




  // Observable that emits whether both profiles exist
  hasBothProfiles$ = this.user$.pipe(
    map((user) => !!user?.brandProfile && !!user?.creativeProfile),
  );

  // Observable that emits whether only brand profile exists
  hasOnlyBrandProfile$ = this.user$.pipe(
    map((user) => !!user?.brandProfile && !user?.creativeProfile),
  );

  // Observable that emits whether only creative profile exists
  hasOnlyCreativeProfile$ = this.user$.pipe(
    map((user) => !user?.brandProfile && !!user?.creativeProfile),
  );

  setActiveProfile(profile: 'brand' | 'creative') {
    this.profileService.setActiveProfile(profile);
  }

  toggleProfile() {
    if (this.activeProfile() === 'brand') {
      this.profileService.setActiveProfile('creative');
    } else if (this.activeProfile() === 'creative') {
      this.profileService.setActiveProfile('brand');
    }
  }

  ngOnInit() {
    this.shares$ = this.store.select(selectFilteredShares);
    this.totals$ = this.store.select(selectTotals);
    this.user$ = this.store.select(selectCurrentUser);
    this.loadShares();
    this.user$.pipe(first()).subscribe(user => {
      this.initializeActiveProfile(user);
    });
  }


  private initializeActiveProfile(user: any) {
    const hasBrandProfile = !!user?.brandProfile;
    const hasCreativeProfile = !!user?.creativeProfile;

    if (hasBrandProfile && hasCreativeProfile) {
      // Default to brand profile if both exist
      this.profileService.setActiveProfile('brand');
    } else if (hasBrandProfile) {
      this.profileService.setActiveProfile('brand');
    } else if (hasCreativeProfile) {
      this.profileService.setActiveProfile('creative');
    } else {
      this.profileService.setActiveProfile('brand'); // or null if you prefer
    }
  }

  async loadShares() {
    const user = await firstValueFrom(this.user$);
    if (!user) {
      return;
    }
    this.store.dispatch(SharesActions.loadShares({ userId: user.id as number }));
  }
  routeTo(path: string) {
    this.router.navigate([path]);
  }
}
