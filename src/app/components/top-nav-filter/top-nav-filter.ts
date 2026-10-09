import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { Component, DestroyRef, HostListener, inject, Input, Renderer2, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { WalletService } from '../../core/api';
import { catchError, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { userDisplayName } from '../../core/utils/user-display';

@Component({
  selector: 'app-top-nav-filter',
  imports: [RouterLink, RouterLinkActive, ThemeToggle],
  templateUrl: './top-nav-filter.html',
  styleUrl: './top-nav-filter.scss',
})
export class TopNavFilter {
  @Input() userInitials = '';
  userName = '';
  /** Wallet balance, formatted in naira. */
  balance = signal('₦0');
  /** Number badge shown on the menu button and next to "Invites and applications". 0 hides both. */
  @Input() pendingCount = 0;

  private renderer = inject(Renderer2);
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private profileService = inject(ActiveProfileService);
  private walletApi = inject(WalletService);

  /** Same profile gating as the desktop sidebar. */
  activeProfile = this.profileService.activeProfile;
  hasBothProfiles = this.profileService.hasBothProfiles;
  private currentUser$ = this.store.select(selectCurrentUser);

  constructor() {
    // Never leave the page scroll-locked if we're torn down with the drawer open.
    this.destroyRef.onDestroy(() => this.renderer.removeStyle(document.body, 'overflow'));
    this.currentUser$
      .pipe(
        map((user) => user?.trendors_id),
        filter((id): id is string => !!id),
        distinctUntilChanged(),
        switchMap((id) =>
          this.walletApi.walletControllerGetUserWallet(String(id)).pipe(
            map((res: any) => Number(res?.data?.balance ?? 0)),
            catchError(() => of(0)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((balance) => {
        this.balance.set(`₦${balance.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`);
      });

    // Keep profile selection (and avatar initials) in sync with the store user.
    this.currentUser$.pipe(takeUntilDestroyed()).subscribe((user) => {
      this.profileService.init(user);
      if (user) {
        this.userName = userDisplayName(user);
        const parts = this.userName.split(/\s+/).filter(Boolean);
        this.userInitials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
      }
    });
  }

  drawerOpen = false;

  toggleDrawer(): void {
    this.drawerOpen ? this.closeDrawer() : this.openDrawer();
  }

  openDrawer(): void {
    this.drawerOpen = true;
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.renderer.removeStyle(document.body, 'overflow');
  }

  setProfile(profile: 'brand' | 'creative'): void {
    this.profileService.setActiveProfile(profile);
  }

  logout(): void {
    this.closeDrawer();
    this.store.dispatch(logoutUser());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
  }
}
