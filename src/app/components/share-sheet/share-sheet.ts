import { Component, DestroyRef, Inject, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UtilService } from '../../core/services/utility/utility.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { SharesActions } from '../../store/shares/shares.action';
import { CreateShare, SocialMedia } from '../../core/models/shares/shares.model';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { LoaderComponent } from '../loader/loader';
import { ToastService } from '../toast/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-share-sheet',
  imports: [MatListModule, MatIconModule, AsyncPipe, LoaderComponent],
  standalone: true,
  templateUrl: './share-sheet.html',
  styleUrl: './share-sheet.scss',
})
export class ShareSheet implements OnInit {
  private utilService = inject(UtilService);
  private sheetRef = inject(MatBottomSheetRef<ShareSheet>);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  baseurl = environment.baseUrl;

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: { post: any },
    private store: Store,
  ) {}

  selectedPost: string | null = null;
  shareVersions$!: Observable<any[]>;
  trends$!: Observable<any[]>;
  isAiLoading = false;
  /** Latest trends, read synchronously when a share button is clicked. */
  private trendNames: string[] = [];
  private user: any = null;

  ngOnInit() {
    this.store
      .select(selectCurrentUser)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => (this.user = user));
    this.selectedPost = this.data.post.text;
    this.fetchAiRewrite();
    this.fetchXtrends();
  }

  selectVersion(post: string) {
    this.selectedPost = post;
  }

  private fetchAiRewrite() {
    const text = this.data.post.text;
    if (!text) return;

    this.isAiLoading = true;
    this.shareVersions$ = this.utilService.fetchAiRewrite(text).pipe(
      tap({
        next: () => (this.isAiLoading = false),
        error: (err) => {
          console.error('AI Rewrite failed:', err);
          this.isAiLoading = false;
        },
      }),
      catchError(() => of([])),
    );
  }

  private fetchXtrends() {
    this.trends$ = this.utilService.fetchTrends().pipe(
      map((data) => data?.trends ?? []),
      tap((trends) => (this.trendNames = trends.slice(0, 4).map((t: any) => `${t.name}`))),
      catchError(() => of([])),
      shareReplay(1),
    );
  }

  private get post() {
    return this.data.post;
  }

  private get postLink(): string {
    return `${this.baseurl}/post/${this.post.id}`;
  }

  private get shareText(): string {
    return this.selectedPost || this.post.text || '';
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.postLink);
      this.toast.show('Link copied.', 'success');
    } catch {
      this.toast.show('Could not copy the link.', 'error');
    }
  }

  close(): void {
    this.sheetRef.dismiss();
  }

  shareToX() {
    const text = [this.shareText, '', `View more: ${this.postLink}`, this.trendNames.join(' ')]
      .join('\n')
      .trim();
    this.openAndRecord(
      `https://twitter.com/intent/tweet?${new URLSearchParams({ text })}`,
      SocialMedia.X,
    );
  }

  shareToFacebook() {
    this.openAndRecord(
      `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: this.postLink })}`,
      SocialMedia.FACEBOOK,
    );
  }

  shareToLinkedIn() {
    this.openAndRecord(
      `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url: this.postLink })}`,
      SocialMedia.LINKEDIN,
    );
  }

  shareToTelegram() {
    this.openAndRecord(
      `https://t.me/share/url?${new URLSearchParams({ url: this.postLink, text: this.shareText })}`,
      SocialMedia.TELEGRAM,
    );
  }

  shareToWhatsApp() {
    const text = `${this.shareText}\n\nView more: ${this.postLink}`;
    this.openAndRecord(
      `https://api.whatsapp.com/send?${new URLSearchParams({ text })}`,
      SocialMedia.WHATSAPP,
    );
  }

  /**
   * Open the share window synchronously inside the click handler (anything
   * awaited first loses the user gesture and gets popup-blocked), then record
   * the share in the background.
   */
  private openAndRecord(shareUrl: string, socialMedia: SocialMedia): void {
    const win = window.open(shareUrl, '_blank', 'width=550,height=420');
    if (!win || win.closed) {
      this.toast.show('Allow pop-ups for this site to share.', 'error');
      return;
    }
    this.recordShare(shareUrl, socialMedia);
  }

  private recordShare(shareUrl: string, socialMedia: SocialMedia): void {
    // Sharer identity and IP are taken server-side from the token/connection;
    // these fields stay for API compatibility only.
    const share: CreateShare = {
      postId: this.post.id,
      sharers_trendorsId: this.user?.trendors_id ?? '',
      sharers_userId: String(this.user?.id ?? ''),
      deviceId: this.getOrCreateDeviceId(),
      ipAddress: '',
      external_post_url: shareUrl,
      social_media: socialMedia,
    };
    this.store.dispatch(SharesActions.createShares({ data: share }));
  }

  private getOrCreateDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch {
      return '';
    }
  }
}
