// import { Component, inject, OnInit } from '@angular/core';
// import { Store } from '@ngrx/store';
// import { map, take } from 'rxjs';
// import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
// import { MatListModule } from '@angular/material/list';
// import { MatButtonModule } from '@angular/material/button';
// import { RouterModule } from '@angular/router';
// import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
// import { NotificationActions } from '../../../store/notification/notification.action';
// import {
//   selectAllNotifications,
//   selectNotificationsLoading,
// } from '../../../store/notification/notification.selector';
// import { FormsModule } from '@angular/forms';

// @Component({
//   selector: 'app-notifications-page',
//   imports: [AsyncPipe, DatePipe, MatListModule, MatButtonModule, RouterModule, CommonModule, FormsModule,],
//   templateUrl: './notification.html',
//   styleUrl: './notification.scss',
// })
// export class NotificationsPage implements OnInit {
//   private store = inject(Store);

//   notifications$ = this.store.select(selectAllNotifications);
//   loading$ = this.store.select(selectNotificationsLoading);
//   user$ = this.store.select(selectCurrentUser);

//   typeIcons: Record<string, string> = {
//   campaign: '◆',
//   payment:  '₦',
//   system:   '◈',
//   warning:  '⚠',
// };

// unreadCount$ = this.notifications$.pipe(
//   map(notifs => notifs.filter(n => !n.isRead).length)
// );

// markAllRead(): void {
//   // dispatch your store action
// }

//   ngOnInit() {
//     this.notifications$.subscribe((n) => {
//       console.log('STORE notifications:', n);
//     });
//     this.user$.pipe(take(1)).subscribe((u) => {
//       if (u && u.id) {
//         this.store.dispatch(NotificationActions.loadNotifications({ trendorId: u.trendors_id }));
//       }
//     });
//   }

//   markRead(notificationId: number, trendorId: string) {
//     this.store.dispatch(NotificationActions.markAsRead({ notificationId, trendorId }));
//   }
// }


import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, map, take } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../../store/notification/notification.action';
import { selectAllNotifications, selectNotificationsLoading } from '../../../store/notification/notification.selector';
import { UserInfoCard } from '../../../components/user-info-card/user-info-card';

// Types - Match your actual notification structure
export interface Notification {
  id: number;
  title: string;
  message?: string;
  type: 'campaign' | 'payment' | 'system' | 'warning';
  isRead: boolean;
  createdAt: Date;
  trendors_id: string;
}

@Component({
  selector: 'app-notifications-page',
  imports: [AsyncPipe, DatePipe, MatListModule, MatButtonModule, RouterModule, CommonModule, FormsModule, UserInfoCard],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationsPage implements OnInit {
  private store = inject(Store);

  // Store selectors - Match your actual selectors
  notifications$ = this.store.select(selectAllNotifications);
  loading$ = this.store.select(selectNotificationsLoading);
  user$ = this.store.select(selectCurrentUser);

  // Type icons - Same as your NotificationsPage
  typeIcons: Record<string, string> = {
    campaign: '◆',
    payment: '₦',
    system: '◈',
    warning: '⚠',
  };

  // Calculate unread count from notifications
  unreadCount$ = this.notifications$.pipe(
    map(notifications => notifications.filter(n => !n.isRead).length)
  );

  // Current user ID for dispatch actions
  private currentTrendorId: string | null = null;

  ngOnInit(): void {
    // Get current user ID on init
    this.user$.pipe(take(1)).subscribe((user) => {
      if (user?.trendors_id) {
        this.currentTrendorId = user.trendors_id;
        this.loadNotifications();
      }
    });
  }

  /**
   * Load notifications from store
   */
  loadNotifications(): void {
    if (!this.currentTrendorId) return;
    this.store.dispatch(
      NotificationActions.loadNotifications({ trendorId: this.currentTrendorId })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllRead(): void {
    if (!this.currentTrendorId) return;

    // Get all unread notification IDs and mark them
    this.notifications$
      .pipe(
        take(1),
        map(notifications => notifications.filter(n => !n.isRead))
      )
      .subscribe(unreadNotifications => {
        unreadNotifications.forEach(notification => {
          this.store.dispatch(
            NotificationActions.markAsRead({
              notificationId: notification.id,
              trendorId: this.currentTrendorId!,
            })
          );
        });
      });
  }

  /**
   * Mark single notification as read when clicked
   */
  onNotificationClick(notification: any): void {
    if (!notification.isRead && this.currentTrendorId) {
      this.store.dispatch(
        NotificationActions.markAsRead({
          notificationId: notification.id,
          trendorId: this.currentTrendorId,
        })
      );
    }
  }
}

