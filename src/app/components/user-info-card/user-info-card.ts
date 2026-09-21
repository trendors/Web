import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom, map, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { selectFilteredShares, selectTotals } from '../../store/shares/shares.selector';
import { SharesActions } from '../../store/shares/shares.action';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { hasBrandProfile, hasCreativeProfile } from '../../core/utils/user-display';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule, AsyncPipe],
  templateUrl: './user-info-card.html',
  styleUrls: ['./user-info-card.scss'],
})
export class UserInfoCard {
  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
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
    map((user) => hasBrandProfile(user) && hasCreativeProfile(user)),
  );

  // Observable that emits whether only brand profile exists
  hasOnlyBrandProfile$ = this.user$.pipe(
    map((user) => hasBrandProfile(user) && !hasCreativeProfile(user)),
  );

  // Observable that emits whether only creative profile exists
  hasOnlyCreativeProfile$ = this.user$.pipe(
    map((user) => !hasBrandProfile(user) && hasCreativeProfile(user)),
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
    // Re-run profile selection on every user emission (not just the first):
    // the login payload often lacks relations, which arrive later via refresh.
    // init() keeps a stored choice whenever it is still valid, so manual
    // toggles are never clobbered.
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.initializeActiveProfile(user);
    });
  }


  private initializeActiveProfile(user: any) {
    // Single source of truth lives in the service: it re-evaluates the stored
    // preference against this user's actual profiles (brand-only logins must
    // not inherit a stale 'creative' choice and vice versa).
    this.profileService.init(user);
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
