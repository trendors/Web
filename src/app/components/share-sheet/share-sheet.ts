import { Component, Inject, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { PostService } from '../../core/services/posts/post.service';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { Actions } from '@ngrx/effects';
import { UtilService } from '../../core/services/utility/utility.service';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AsyncPipe } from '@angular/common';
import { SeoService } from '../../core/services/utility/seoservice';



@Component({
  selector: 'app-share-sheet',
  imports: [
    MatListModule, MatIconModule, AsyncPipe
  ],
  templateUrl: './share-sheet.html',
  styleUrl: './share-sheet.scss',
})
export class ShareSheet {
  private utilService = inject(UtilService);

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: { post: any },
    private bottomSheetRef: MatBottomSheetRef<ShareSheet>, private seoService: SeoService ) { }

  selectedPost!: string
  shareVersions$!: Observable<any[]>;
  trends$!: Observable<any[]>

  ngOnInit() {

    this.fetchAireWrite()
    this.fetchXtrends()

  }

  selectVersion(post: string) {
    this.selectedPost = post
    console.log(this.selectedPost, "selected version")
  }

  fetchAireWrite() {
    let text = this.data.post.text
    this.shareVersions$ = this.utilService.fetchAiRewrite(text)

  }

  fetchXtrends() {
    this.trends$ = this.utilService.fetchTrends().pipe(
      map(data => {
        return data.trends
      })
    )
  }

  copyLink() { }

  shareTo(url?: string) { }

  close() { }

  async shareToX(post: any) {

    
    const top4trends = await firstValueFrom(
      this.trends$.pipe(
        map((data: any[]) =>
          data.slice(0, 4).map(item => item.name).join(', ')
        )
      )
    );

    const baseUrl = 'https://twitter.com/intent/tweet';
    const params = new URLSearchParams({
      text: `${post.text}\n\n~ ${top4trends}\n\n${post.images[0]}\n\nView more: https://b5267a42e435.ngrok-free.app/post/24`
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }

  shareToFacebook(post: any) {
    const baseUrl = 'https://www.facebook.com/sharer/sharer.php';
    const params = new URLSearchParams({
      u: `https://b5267a42e435.ngrok-free.app/post/${post.id}`,
      quote: post.text
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }

  shareToLinkedIn(post: any) {
    const baseUrl = 'https://www.linkedin.com/sharing/share-offsite/';
    const params = new URLSearchParams({
      url: `https://b5267a42e435.ngrok-free.app/post/${post.id}`
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }

  shareToTelegram(post: any) {
    const baseUrl = 'https://t.me/share/url';
    const params = new URLSearchParams({
      url: `https://b5267a42e435.ngrok-free.app/post/${post.id}`,
      text: post.text
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }

shareToWhatsApp(post: any) {
    const baseUrl = 'https://api.whatsapp.com/send';
    const params = new URLSearchParams({
      text: `${post.text}\n\nView more: https://b5267a42e435.ngrok-free.app/post/${post.id}`
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }

  
}