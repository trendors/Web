import { Component, DestroyRef, HostListener, inject, Input, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { SharesActions } from '../../store/shares/shares.action';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { selectFilteredShares } from '../../store/shares/shares.selector';
import { ActiveProfileService } from '../../core/services/activeprofile.service';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { userDisplayName } from '../../core/utils/user-display';

@Component({
  selector: 'app-top-nav-filter',
  imports: [MatIconModule,
    MatCardModule,
    MatInputModule,
    RouterLink,
    RouterLinkActive,],
  templateUrl: './top-nav-filter.html',
  styleUrl: './top-nav-filter.scss',
})
export class TopNavFilter {
 @Input() userInitials = 'JD';
  @Input() earned = '$4.20';
  /** Number badge shown on the menu button and next to "Invites and applications". 0 hides both. */
  @Input() pendingCount = 0;

  private renderer = inject(Renderer2);
  private store = inject(Store);
  private destroyRef = inject(DestroyRef);
  private profileService = inject(ActiveProfileService);

  /** Same profile gating as the desktop sidebar. */
  activeProfile = this.profileService.activeProfile;
  private currentUser$ = this.store.select(selectCurrentUser);

  constructor() {
    // Keep profile selection (and avatar initials) in sync with the store user.
    this.currentUser$.pipe(takeUntilDestroyed()).subscribe((user) => {
      this.profileService.init(user);
      if (user) {
        const parts = userDisplayName(user).split(/\s+/).filter(Boolean);
        this.userInitials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || 'JD';
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

  logout(): void {
    this.closeDrawer();
    this.store.dispatch(logoutUser());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.drawerOpen) this.closeDrawer();
  }
}
