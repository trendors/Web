import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { NotificationService } from '../../core/services/notification/notification.service';
import { NotificationActions } from './notification.action';
import { mergeMap, map, catchError, of } from 'rxjs';

@Injectable()
export class NotificationEffects {
  private actions$ = inject(Actions);
  private notificationService = inject(NotificationService);

  loadNotifications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.loadNotifications),
      mergeMap(({ trendorId }) =>
        this.notificationService.findMyNotifications(trendorId).pipe(
          map((res) => {
            if (res.error)
              return NotificationActions.loadNotificationsFailure({ error: res.message });
            return NotificationActions.loadNotificationsSuccess({ notifications: res.data ?? [] });
          }),
          catchError((err) =>
            of(
              NotificationActions.loadNotificationsFailure({
                error: err?.message || 'Load failed',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  markAsRead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(NotificationActions.markAsRead),
      mergeMap(({ notificationId, trendorId }) =>
        this.notificationService.markAsRead(notificationId, trendorId).pipe(
          map((res) => {
            if (res.error) return NotificationActions.markAsReadFailure({ error: res.message });
            return NotificationActions.markAsReadSuccess({ notificationId });
          }),
          catchError((err) =>
            of(NotificationActions.markAsReadFailure({ error: err?.message || 'Mark failed' })),
          ),
        ),
      ),
    ),
  );
}
