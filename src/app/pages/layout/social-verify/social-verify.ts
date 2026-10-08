import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
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

    const apiOrigin = new URL(environment.apiUrl).origin;
    const popup = window.open(
      `${environment.apiUrl}/user/twitter?${new URLSearchParams({ trendors_id: String(trendorsId) })}`,
      'twitterAuth',
      'width=500,height=600',
    );
    if (!popup) {
      this.toast.show('Allow pop-ups for this site to connect X.', 'error');
      return;
    }

    this.removeMessageListener();
    this.messageListener = (event: MessageEvent) => {
      if (event.origin !== apiOrigin || event.data?.type !== 'twitter-connected') return;
      this.removeMessageListener();
      this.toast.show('X account connected.', 'success');
      if (typeof user?.id === 'number') {
        this.store.dispatch(UserAction.loadCurrentUser({ userId: user.id }));
      }
    };
    window.addEventListener('message', this.messageListener);
  }

  private removeMessageListener(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }
}
