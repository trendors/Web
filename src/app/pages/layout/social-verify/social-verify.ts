import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { userDisplayName } from '../../../core/utils/user-display';
import { environment } from '../../../../environments/environment';
import { UserAction } from '../../../store/user/user.action';
import { UserService } from '../../../core/services/users/user.service';
import { ToastService } from '../../../components/toast/toast.service';

@Component({
  selector: 'app-social-verify',
  imports: [ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe, CommonModule, FormsModule,],
  templateUrl: './social-verify.html',
  styleUrl: './social-verify.scss',
})
export class SocialVerify {
  private store = inject(Store);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private users = inject(UserService);
  disconnecting = signal(false);

  user$ = this.store.select(selectCurrentUser);
  protected readonly displayName = userDisplayName;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.removeMessageListener());
  }

  /** Twitter/X OAuth runs in a popup on the API; it posts back when linked. */
  openTwitter(): void {
    let user: any = null;
    this.user$.pipe(take(1)).subscribe((u) => (user = u));
    const trendorsId = user?.trendors_id;
    if (!trendorsId) {
      this.toast.show('Please log in again to connect your account.', 'error');
      return;
    }

    const oauthBase = environment.oauthApiUrl || environment.apiUrl;
    const apiOrigin = new URL(oauthBase).origin;
    const popup = window.open(
      `${oauthBase}/user/twitter?${new URLSearchParams({ trendors_id: String(trendorsId) })}`,
      'twitterAuth',
      'width=500,height=600',
    );
    if (!popup) {
      this.toast.show('Allow pop-ups for this site to connect X.', 'error');
      return;
    }

    this.removeMessageListener();
    this.messageListener = (event: MessageEvent) => {
      if (event.origin !== apiOrigin) return;
      if (event.data?.type === 'twitter-error') {
        this.removeMessageListener();
        this.toast.show(this.twitterErrorText(event.data?.reason), 'error', 6000);
        return;
      }
      if (event.data?.type !== 'twitter-connected') return;
      this.removeMessageListener();
      this.toast.show('X account connected.', 'success');
      if (typeof user?.id === 'number') {
        this.store.dispatch(UserAction.loadCurrentUser({ userId: user.id }));
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  /** Unlink X. Without it the creator stops matching X campaigns, so ask first. */
  disconnectTwitter(userId: unknown): void {
    if (typeof userId !== 'number' || this.disconnecting()) return;
    if (!window.confirm('Disconnect your X account? You will stop matching X campaigns until you reconnect.')) return;
    this.disconnecting.set(true);
    this.users.disconnectTwitter().subscribe({
      next: () => {
        this.disconnecting.set(false);
        this.toast.show('X account disconnected.', 'success');
        this.store.dispatch(UserAction.loadCurrentUser({ userId }));
      },
      error: (e: Error) => {
        this.disconnecting.set(false);
        this.toast.show(e.message || 'Could not disconnect X. Try again.', 'error', 6000);
      },
    });
  }

  private twitterErrorText(reason: unknown): string {
    switch (reason) {
      case 'missing_session': return 'Could not link X: your session was lost during sign-in. Open the app and the API on the same host (localhost or 127.0.0.1) and try again.';
      case 'access_denied': return 'X sign-in was cancelled.';
      case 'save_failed': return 'X sign-in worked but we could not save it. Please try again.';
      default: return 'Could not connect X. Please try again.';
    }
  }

  private removeMessageListener(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }
}
