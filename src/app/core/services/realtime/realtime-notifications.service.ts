import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, take } from 'rxjs';
import { ToastService } from '../../../components/toast/toast.service';
import { RealtimeEvent, SocketService } from '../../../socket.service';
import { selectAuthToken, selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../../store/notification/notification.action';
import { Notification } from '../../models/notification/notification.model';

/** Path part of an in-app link, for "is the user already looking at this?". */
export function linkPath(link: string | undefined | null): string {
  return (link ?? '').split(/[?#]/)[0].replace(/\/+$/, '');
}

/**
 * Keeps the logged-in realtime channel in step with the session and feeds it
 * into the app: connects when there is a token, disconnects on logout, puts
 * pushed notifications in the store (header badge, list), shows a toast unless
 * the user is already on that page, and reloads the list after every
 * reconnect so nothing sent while offline is missed. Started once by the root
 * component; does nothing on the server.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeNotificationsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly store = inject(Store);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (!this.isBrowser || this.started) return;
    this.started = true;
    const untilDestroyed = takeUntilDestroyed<any>(this.destroyRef);

    this.store
      .select(selectAuthToken)
      .pipe(distinctUntilChanged(), untilDestroyed)
      .subscribe((token) => (token ? this.socket.connectRealtime(token) : this.socket.disconnectRealtime()));

    this.socket
      .on<Notification>(RealtimeEvent.Notification)
      .pipe(untilDestroyed)
      .subscribe((notification) => {
        this.store.dispatch(NotificationActions.notificationReceived({ notification }));
        const here = linkPath(this.router.url);
        const target = linkPath(notification.data?.link);
        if (!target || target !== here) this.toast.show(notification.message, 'info', 5000);
      });

    this.socket
      .on<{ id: number }>(RealtimeEvent.NotificationRead)
      .pipe(untilDestroyed)
      .subscribe(({ id }) => this.store.dispatch(NotificationActions.notificationReadElsewhere({ notificationId: id })));

    this.socket.connected$.pipe(untilDestroyed).subscribe(() => {
      this.store
        .select(selectCurrentUser)
        .pipe(take(1))
        .subscribe((user) => {
          if (user?.trendors_id) {
            this.store.dispatch(NotificationActions.loadNotifications({ trendorId: user.trendors_id }));
          }
        });
    });
  }
}
