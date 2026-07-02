
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

  notifications$ = this.store.select(selectAllNotifications);
  loading$ = this.store.select(selectNotificationsLoading);
  user$ = this.store.select(selectCurrentUser);

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
          trendorId: notification.trendorId,
        })
      );
       this.loadNotifications();
    }
  }

   getIconClass(type: string): string {
    const iconMap: { [key: string]: string } = {
      'INVITATION RECEIVED': 'ti-user-plus',
      'NEW INTERACTION': 'ti-heart',
      'EVENT REMINDER': 'ti-calendar-event',
      'CONNECTION REQUEST': 'ti-user-plus',
      'NEW COMMENT': 'ti-message-circle',
      'POST UPDATE': 'ti-bell'
    };
    return iconMap[type] || 'ti-bell';
  }

  formatTime(date: string): string {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return notifDate.toLocaleDateString();
  }
}

