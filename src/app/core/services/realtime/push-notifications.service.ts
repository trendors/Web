import { DestroyRef, Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { distinctUntilChanged, firstValueFrom, pairwise, startWith } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { selectAuthToken } from '../../../store/auth/sharedState/auth.selector';

/** Must match the channelId the backend sends (PushService). */
export const PUSH_CHANNEL_ID = 'default';

/**
 * Phone push notifications (native app only). Registers the device with the
 * backend while someone is logged in, forgets it on logout, and opens the
 * notification's in-app link when one is tapped. While the app is open the
 * realtime socket already delivers notifications, so foreground pushes are
 * ignored. Started once by the root component; does nothing on web/server.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly enabled =
    isPlatformBrowser(inject(PLATFORM_ID)) && Capacitor.isNativePlatform();
  private readonly store = inject(Store);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly endpoint = `${environment.apiUrl}/push/devices`;
  private started = false;
  /** FCM token of this install, once Firebase has handed it out. */
  private deviceToken: string | null = null;

  start(): void {
    if (!this.enabled || this.started) return;
    this.started = true;

    // Listeners go on first so a tap that cold-started the app is not lost.
    void PushNotifications.addListener('registration', ({ value }) => {
      this.deviceToken = value;
      void this.sendToken(value);
    });
    void PushNotifications.addListener('registrationError', (err) =>
      console.warn('Push registration failed', err),
    );
    void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const link = notification.data?.link;
      if (typeof link === 'string' && link.startsWith('/')) {
        this.zone.run(() => void this.router.navigateByUrl(link));
      }
    });

    void PushNotifications.createChannel({
      id: PUSH_CHANNEL_ID,
      name: 'Notifications',
      description: 'Offers, campaign updates and payments',
      importance: 4,
    });

    this.store
      .select(selectAuthToken)
      .pipe(distinctUntilChanged(), startWith(null), pairwise(), takeUntilDestroyed(this.destroyRef))
      .subscribe(([previous, current]) => {
        if (current) void this.register();
        else if (previous) void this.unregister(previous);
      });
  }

  /** Ask permission (Android 13+ prompts) and get a token; the listener sends it on. */
  private async register(): Promise<void> {
    try {
      let { receive } = await PushNotifications.checkPermissions();
      if (receive === 'prompt' || receive === 'prompt-with-rationale') {
        ({ receive } = await PushNotifications.requestPermissions());
      }
      if (receive !== 'granted') return;
      if (this.deviceToken) await this.sendToken(this.deviceToken);
      else await PushNotifications.register();
    } catch (err) {
      console.warn('Push setup failed', err);
    }
  }

  private async sendToken(token: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(this.endpoint, { token, platform: Capacitor.getPlatform() }),
      );
    } catch (err) {
      console.warn('Could not register device for push', err);
    }
  }

  /**
   * On logout: tell the server to stop (with the session that just ended, since
   * the store has already cleared it) and drop this install's FCM token, so the
   * next person to sign in on this phone gets a fresh one.
   */
  private async unregister(sessionToken: string): Promise<void> {
    const token = this.deviceToken;
    this.deviceToken = null;
    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${sessionToken}`,
        // Not the interceptor's business: a 401 here must not log out again.
        'x-skip-auth': 'true',
      });
      await firstValueFrom(this.http.post(`${this.endpoint}/unregister`, { token }, { headers })).catch(
        () => undefined,
      );
    }
    await PushNotifications.unregister().catch(() => undefined);
  }
}
