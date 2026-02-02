import { createFeatureSelector, createSelector } from '@ngrx/store';
import { NotificationsState, notificationsFeatureKey } from './notification.reducer';

export const selectNotificationsState =
  createFeatureSelector<NotificationsState>(notificationsFeatureKey);

export const selectAllNotifications = createSelector(
  selectNotificationsState,
  (state) => state.notifications,
);

export const selectNotificationsLoading = createSelector(
  selectNotificationsState,
  (state) => state.isLoading,
);

export const selectUnreadCount = createSelector(
  selectAllNotifications,
  (notifications) => notifications.filter((n) => !n.isRead).length,
);

export const selectNotificationsError = createSelector(
  selectNotificationsState,
  (state) => state.error,
);
