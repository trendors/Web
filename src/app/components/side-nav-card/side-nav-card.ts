import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../store/notification/notification.action';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { selectUnreadCount } from '../../store/notification/notification.selector';
import { AsyncPipe } from '@angular/common';
import { ActiveProfileService } from '../../core/services/activeprofile.service';

@Component({
  selector: 'app-side-nav-card',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive],
  templateUrl: './side-nav-card.html',
  styleUrl: './side-nav-card.scss',
})
export class SideNavCard implements OnInit {
  // constructor(private router: Router, private store: Store) {} // Inject it here

  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  unreadCount$ = this.store.select(selectUnreadCount);
  currentUser$ = this.store.select(selectCurrentUser);

  private profileService = inject(ActiveProfileService);
    activeProfile = this.profileService.activeProfile;    
  

  ngOnInit() {
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user?.id) {
        this.store.dispatch(NotificationActions.loadNotifications({ trendorId: user.trendors_id as string }));
      }
    });
    // Keep the active profile in sync on every user change, even on pages
    // without the user card (late-arriving relations included).
    this.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.profileService.init(user);
    });
  }
  

  routeTo(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    // Go through the store so token/user/activeProfile are all cleared.
    this.store.dispatch(logoutUser());
  }
}
