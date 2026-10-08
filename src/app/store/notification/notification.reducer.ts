import { createReducer, on } from '@ngrx/store';
import { NotificationActions } from './notification.action';
import { Notification } from '../../core/models/notification/notification.model';

export const notificationsFeatureKey = 'notifications';

export interface NotificationsState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}

export const initialState: NotificationsState = {
  notifications: [],
  isLoading: false,
  error: null,
};

export const notificationsReducer = createReducer(
  initialState,
  on(NotificationActions.loadNotifications, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(NotificationActions.loadNotificationsSuccess, (state, { notifications }) => ({
    ...state,
    notifications,
    isLoading: false,
  })),
  on(NotificationActions.loadNotificationsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  // Marking as read is a background update; it must not flash the list's loader.
  on(NotificationActions.markAsReadSuccess, (state, { notificationId }) => ({
    ...state,
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    ),
  })),
  on(NotificationActions.markAsReadFailure, (state, { error }) => ({ ...state, error })),
  // Newest first; a reconnect reload can race a push, so never duplicate.
  on(NotificationActions.notificationReceived, (state, { notification }) =>
    state.notifications.some((n) => n.id === notification.id)
      ? state
      : { ...state, notifications: [notification, ...state.notifications] },
  ),
  on(NotificationActions.notificationReadElsewhere, (state, { notificationId }) => ({
    ...state,
    notifications: state.notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
  })),
);
