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
  on(NotificationActions.markAsRead, (state) => ({ ...state, isLoading: true, error: null })),
  on(NotificationActions.markAsReadSuccess, (state, { notificationId }) => ({
    ...state,
    isLoading: false,
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    ),
  })),
  on(NotificationActions.markAsReadFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
);
