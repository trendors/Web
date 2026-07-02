import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { PostService } from '../../../core/services/posts/post.service';
import { UtilService } from '../../../core/services/utility/utility.service';
import { FetchPostDto, FetchPostResponse, Post } from '../../../core/models/posts/post.model';
import { SeoService } from '../../../core/services/utility/seoservice';

@Component({
  selector: 'app-single-post',
  imports: [MatIcon, CommonModule, AsyncPipe, DatePipe],
  templateUrl: './single-post.html',
  styleUrls: ['./single-post.scss'],
})
export class SinglePost {

  post$!: Observable<Post>;
  trends$: Observable<any>;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private utilService: UtilService,
    private seoService: SeoService
  ) {
    // We can initialize trends here or in ngOnInit
    this.trends$ = this.utilService.fetchTrends();
  }

  ngOnInit(): void {
    this.post$ = this.route.paramMap.pipe(
      tap(() => this.isLoading = true),
      switchMap((params: any) => {
        const postId = params.get('id');
        // Fetch post without forcing auth — allow public viewing of posts
        return this.postService.findOne(Number(postId), { skipAuth: true }).pipe(
          tap(() => this.isLoading = false),
          switchMap((response: FetchPostResponse) => {
            if (response.status === 'SUCCESS' && response.data) {

              this.seoService.setTwitterCard({
                title: response.data?.text || 'Post Detail',
                desc: response.data?.text || 'No excerpt available',
                image: response.data?.images?.[0] ?? '',
                url: `https://c967-102-90-123-32.ngrok-free.app/post/${response.data?.id}`
              });

              return new Observable<Post>((observer) => {
                observer.next(response.data!);
                observer.complete();
              });
            } else {
              // this.router.navigate(['/feed']);
              return new Observable<Post>((observer) => observer.complete());
            }
          })
        );
      }),
      tap(() => this.isLoading = false)
    );
  }

  onLike(postId: number | string) {
    // Implement your like logic
  }

  goBack() {
    this.router.navigate(['/feed']);
  }


  async openShareMenu(post: any) {
    // Re-using your logic for sharing to X
    // You can call your existing share logic here
  }
}
