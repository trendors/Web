import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../store/notification/notification.action';
import { selectUnreadCount } from '../../store/notification/notification.selector';
import { AsyncPipe } from '@angular/common';

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

  unreadCount$ = this.store.select(selectUnreadCount);
  currentUser$ = this.store.select(selectCurrentUser);

  ngOnInit() {
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user?.id) {
        this.store.dispatch(NotificationActions.loadNotifications({ trendorId: user.trendors_id }));
      }
    });
  }

  routeTo(path: string) {
    this.router.navigate([path]);
    console.log(`Navigating to: ${path}`);
  }

  logout() {
    this.router.navigate(['/login']);
    localStorage.setItem('token', "");
    localStorage.setItem('user', "");
  }
}
