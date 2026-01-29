import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { PostService } from '../../../core/services/posts/post.service';
import { UtilService } from '../../../core/services/utility/utility.service';
import { FetchPostDto, FetchPostResponse, Post } from '../../../core/models/posts/post.model';

@Component({
  selector: 'app-single-post',
  imports: [MatIcon,     CommonModule,
],
  templateUrl: './single-post.html',
  styleUrl: './single-post.scss',
})
export class SinglePost {

post$!: Observable<Post>;
  trends$: Observable<any>;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private utilService: UtilService
  ) {
    // We can initialize trends here or in ngOnInit
    this.trends$ = this.utilService.fetchTrends();
  }

  ngOnInit(): void {
    // 1. Listen to route parameter changes (e.g., /post/123)
    this.post$ = this.route.paramMap.pipe(
      tap(() => this.isLoading = true),
      switchMap((params: any) => {
        const postId = params.get('id');
        return this.postService.findOne(Number(postId)).pipe(
          tap(() => this.isLoading = false),
          switchMap((response: FetchPostResponse) => {
            if (response.status === 'SUCCESS' && response.data) {
              return new Observable<Post>((observer) => {
                observer.next(response.data!);
                observer.complete();
              });
            } else {
              // Handle error case, e.g., navigate back or show a message
              this.router.navigate(['/feed']);
              return new Observable<Post>((observer) => observer.complete());
            }
          })
        );
      }),
      tap(() => this.isLoading = false)
    );
  }

  onLike(postId: string) {
    // Implement your like logic
    console.log('Liked post:', postId);
  }

  goBack() {
    this.router.navigate(['/feed']);
  }

  async openShareMenu(post: any) {
    // Re-using your logic for sharing to X
    // You can call your existing share logic here
  }
}
