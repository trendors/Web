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
import { Post } from '../../core/models/posts/post.model';



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
    private bottomSheetRef: MatBottomSheetRef<ShareSheet>) { }

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
      text: `${this.selectedPost } \n ~ ${top4trends} \n https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png`
    });

    const shareUrl = `${baseUrl}?${params.toString()}`;
        window.open(shareUrl, '_blank', 'width=550,height=420');

  }

}
