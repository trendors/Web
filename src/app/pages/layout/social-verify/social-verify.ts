import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/internal/operators/take';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';

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

  activeVerify: 'twitter' | 'instagram' | 'tiktok' | null = null;
  verifyMethod: 'oauth' | 'dm' = 'oauth';
  dmHandle = '';
  dmCode = '';
  dmSent = false;
  user$ = this.store.select(selectCurrentUser);
  trendorsId: string | null = null;


  async ngOnInit() {
    console.log('SocialVerify initialized');
    await this.loadUser();
  }

  async loadUser() {
    const user = await firstValueFrom(this.user$);
    if (!user) {
      return;
    }
    this.trendorsId = user.trendors_id?.toString() ?? null;
  }



  twitter = { verified: false, handle: 'johndoe', followers: 12400 };
  instagram = { verified: false, handle: '', followers: 0 };
  tiktok = { verified: false, handle: '', followers: 0 };



  get connectedCount() {
    return [this.twitter, this.instagram, this.tiktok]
      .filter(p => p.verified).length;
  }

  openTwitter() {
    const popup = window.open(`http://127.0.0.1:6001/user/twitter?trendors_id=${this.trendorsId}`, 'twitterAuth', 'width=500,height=600');
    window.addEventListener('message', (event) => {
      if (event.origin !== 'http://localhost:6001' && event.origin !== window.location.origin) return;
      if (event.data.type === 'twitter-connected') {
      }
    });

  }

  openVerify(platform: 'twitter' | 'instagram' | 'tiktok') {
    this.activeVerify = platform;
    this.verifyMethod = 'oauth';
    this.dmHandle = '';
    this.dmCode = '';
    this.dmSent = false;
  }

  closeVerify() { this.activeVerify = null; }

  requestDM() { this.dmSent = true; }

  connectOAuth() { /* trigger OAuth flow */ }

  verifyDMCode() { /* call API to verify code */ }

  disconnect(platform: string) { /* call API */ }
}
