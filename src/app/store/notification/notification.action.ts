import { createActionGroup, props } from '@ngrx/store';
import { Notification } from '../../core/models/notification/notification.model';

export const NotificationActions = createActionGroup({
  source: 'Notifications',
  events: {
    'Load Notifications': props<{ userId: number }>(),
    'Load Notifications Success': props<{ notifications: Notification[] }>(),
    'Load Notifications Failure': props<{ error: string }>(),

    'Mark As Read': props<{ notificationId: number; userId: number }>(),
    'Mark As Read Success': props<{ notificationId: number }>(),
    'Mark As Read Failure': props<{ error: string }>(),
  },
});