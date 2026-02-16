import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../../store/notification/notification.action';
import {
  selectAllNotifications,
  selectNotificationsLoading,
} from '../../../store/notification/notification.selector';

@Component({
  selector: 'app-notifications-page',
  imports: [AsyncPipe, DatePipe, MatListModule, MatButtonModule, RouterModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationsPage implements OnInit {
  private store = inject(Store);

  notifications$ = this.store.select(selectAllNotifications);
  loading$ = this.store.select(selectNotificationsLoading);
  user$ = this.store.select(selectCurrentUser);

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
