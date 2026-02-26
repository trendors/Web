import { CommonModule } from '@angular/common';
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
  imports: [MatIcon, CommonModule,
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
        return this.postService.findOne(Number(postId)).pipe(
          tap(() => this.isLoading = false),
          switchMap((response: FetchPostResponse) => {
            if (response.status === 'SUCCESS' && response.data) {

              this.seoService.setTwitterCard({
                title: response.data?.text.substring(0, 50) || 'Post Detail',
                desc: response.data?.text || 'No excerpt available',
                image: 'https://fakestoreapi.com/img/71-3HjGNDUL._AC_SY879._SX._UX._SY._UY_t.png',
                url: `https://b5267a42e435.ngrok-free.app/post/${response.data?.id}`
              });

              return new Observable<Post>((observer) => {
                observer.next(response.data!);
                observer.complete();
              });
            } else {
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
