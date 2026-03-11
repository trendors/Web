import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../../store/notification/notification.action';
import {
  selectAllNotifications,
  selectNotificationsLoading,
} from '../../../store/notification/notification.selector';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-notifications-page',
  imports: [AsyncPipe, DatePipe, MatListModule, MatButtonModule, RouterModule, CommonModule, FormsModule,],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationsPage implements OnInit {
  private store = inject(Store);

  notifications$ = this.store.select(selectAllNotifications);
  loading$ = this.store.select(selectNotificationsLoading);
  user$ = this.store.select(selectCurrentUser);

  typeIcons: Record<string, string> = {
  campaign: '◆',
  payment:  '₦',
  system:   '◈',
  warning:  '⚠',
};

unreadCount$ = this.notifications$.pipe(
  map(notifs => notifs.filter(n => !n.isRead).length)
);

markAllRead(): void {
  // dispatch your store action
}

  ngOnInit() {
    this.notifications$.subscribe((n) => {
      console.log('STORE notifications:', n);
    });
    this.user$.pipe(take(1)).subscribe((u) => {
      if (u && u.id) {
        this.store.dispatch(NotificationActions.loadNotifications({ userId: u.id }));
      }
    });
  }

  markRead(notificationId: number, userId: number) {
    this.store.dispatch(NotificationActions.markAsRead({ notificationId, userId }));
  }
}
