import { Component, Inject, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { firstValueFrom, map, Observable, tap } from 'rxjs';
import { UtilService } from '../../core/services/utility/utility.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe } from '@angular/common';
import { SeoService } from '../../core/services/utility/seoservice';
import { Store } from '@ngrx/store';
import { SharesActions } from '../../store/shares/shares.action';
import { CreateShare, SocialMedia } from '../../core/models/shares/shares.model';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { LoaderComponent } from "../loader/loader";
import { environment } from '../../../environments/environment.development';



@Component({
  selector: 'app-share-sheet',
  imports: [
    MatListModule, MatIconModule, AsyncPipe,
    LoaderComponent
],
  standalone: true,
  templateUrl: './share-sheet.html',
  styleUrl: './share-sheet.scss',
})
export class ShareSheet {
  private utilService = inject(UtilService);
  baseurl = environment.baseUrl;


  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: { post: any },
    private store: Store) { }

  selectedPost: string | null = null;
  shareVersions$!: Observable<any[]>;
  trends$!: Observable<any[]>
  user$!: Observable<any>;
  isAiLoading = false;


  ngOnInit() {
    this.user$ = this.store.select(selectCurrentUser);
    this.selectedPost = this.data.post.text;
    this.fetchAireWrite()
    this.fetchXtrends()

  }


  selectVersion(post: string) {
    this.selectedPost = post;
  }


fetchAireWrite() {
  const text = this.data.post.text;
  if (!text) return;

  this.isAiLoading = true; 
  this.shareVersions$ = this.utilService.fetchAiRewrite(text).pipe(
    tap({
      next: () => {
        this.isAiLoading = false; 
      },
      error: (err) => {
        console.error('AI Rewrite failed:', err);
        this.isAiLoading = false; 
      }
    })
  );
}

  fetchXtrends() {
    this.trends$ = this.utilService.fetchTrends().pipe(
      map(data => {
        return data.trends
      })
    )
  }

  copyLink(data: any) { }

  shareTo(url?: string) { }

  async getIPAddress() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip as string;
    } catch (error) {
      console.error("Error fetching IP:", error);
      return ""
    }
  }
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  close() { }

  async shareToX(post: any) {
    const currentUser = await firstValueFrom(this.user$);
    let trendText = this.trends$.pipe(map(trends => trends.slice(0, 4).map((t: any) => `${t.name}`).join(' ')));
    const baseUrl = 'https://twitter.com/intent/tweet';
    const params = new URLSearchParams({
      text: `${this.selectedPost}\n \nView more: ${this.baseurl}/post/${post.id} \n${await trendText.toPromise()}`
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const twitterwindow = window.open(shareUrl, '_blank', 'width=550,height=420')
    if (!twitterwindow || twitterwindow.closed || typeof twitterwindow.closed === 'undefined') {

    } else {
      let share: CreateShare = {
        postId: this.data.post.id,
        sharers_trendorsId: currentUser?.trendors_id ?? '',
        sharers_userId: String(currentUser?.id ?? ''),
        deviceId: this.getOrCreateDeviceId(),
        ipAddress: await this.getIPAddress(),
        external_post_url: "string",
        social_media: SocialMedia.X
      }
      this.store.dispatch(SharesActions.createShares({ data: share }))
    }
  }

  async shareToFacebook(post: any) {
    const currentUser = await firstValueFrom(this.user$);
    const baseUrl = 'https://www.facebook.com/sharer/sharer.php';
    const params = new URLSearchParams({
      u: `${this.baseurl}/post/${post.id}`,
      quote: post.text
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const win = window.open(shareUrl, '_blank', 'width=550,height=420');
    if (win && !win.closed) {
      const share: CreateShare = {
        postId: post.id,
        sharers_trendorsId: currentUser?.trendors_id ?? '',
        sharers_userId: String(currentUser?.id ?? ''),
        deviceId: this.getOrCreateDeviceId(),
        ipAddress: await this.getIPAddress(),
        external_post_url: shareUrl,
        social_media: SocialMedia.FACEBOOK
      };
      this.store.dispatch(SharesActions.createShares({ data: share }));
    }
  }

  async shareToLinkedIn(post: any) {
    const currentUser = await firstValueFrom(this.user$);
    const baseUrl = 'https://www.linkedin.com/sharing/share-offsite/';
    const params = new URLSearchParams({
      url: `${this.baseurl}/post/${post.id}`
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const win = window.open(shareUrl, '_blank', 'width=550,height=420');
    if (win && !win.closed) {
      const share: CreateShare = {
        postId: post.id,
        sharers_trendorsId: currentUser?.trendors_id ?? '',
        sharers_userId: String(currentUser?.id ?? ''),
        deviceId: this.getOrCreateDeviceId(),
        ipAddress: await this.getIPAddress(),
        external_post_url: shareUrl,
        social_media: SocialMedia.LINKEDIN
      };
      this.store.dispatch(SharesActions.createShares({ data: share }));
    }
  }

  async shareToTelegram(post: any) {
    const currentUser = await firstValueFrom(this.user$);
    const baseUrl = 'https://t.me/share/url';
    const params = new URLSearchParams({
      url: `${this.baseurl}/post/${post.id}`,
      text: post.text
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const win = window.open(shareUrl, '_blank', 'width=550,height=420');
    if (win && !win.closed) {
      const share: CreateShare = {
        postId: post.id,
        sharers_trendorsId: currentUser?.trendors_id ?? '',
        sharers_userId: String(currentUser?.id ?? ''),
        deviceId: this.getOrCreateDeviceId(),
        ipAddress: await this.getIPAddress(),
        external_post_url: shareUrl,
        social_media: SocialMedia.TELEGRAM
      };
      this.store.dispatch(SharesActions.createShares({ data: share }));
    }
  }

  async shareToWhatsApp(post: any) {
    const currentUser = await firstValueFrom(this.user$);
    const baseUrl = 'https://api.whatsapp.com/send';
    const params = new URLSearchParams({
      text: `${post.text}\n\nView more: ${this.baseurl}/post/${post.id}`
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;
    const win = window.open(shareUrl, '_blank', 'width=550,height=420');
    if (win && !win.closed) {
      const share: CreateShare = {
        postId: post.id,
        sharers_trendorsId: currentUser?.trendors_id ?? '',
        sharers_userId: String(currentUser?.id ?? ''),
        deviceId: this.getOrCreateDeviceId(),
        ipAddress: await this.getIPAddress(),
        external_post_url: shareUrl,
        social_media: SocialMedia.WHATSAPP
      };
      this.store.dispatch(SharesActions.createShares({ data: share }));
    }
  }


}