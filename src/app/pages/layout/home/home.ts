import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// PostCard removed from imports because template doesn't use it
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../../store/auth/shared state/auth.selector';
import { PostActions } from '../../../store/posts/post/posts.actions';
import {
  selectAllPosts,
  selectIsLoadingMore,
  selectIsLoadingPosts,
} from '../../../store/posts/post/posts.selectors';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import {
  CreatePostDto,
  Channel,
  LikePostDto,
  LoadType,
  LoadMoreDto,
} from '../../../core/models/posts/post.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);

  posts$ = this.store.select(selectAllPosts);
  loading$ = this.store.select(selectIsLoadingPosts);
  loadingMore$ = this.store.select(selectIsLoadingMore);
  user$ = this.store.select(selectCurrentUser);

  searchControl = this.fb.control('');

  postForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit() {
    this.loadInitialPosts();

    // Setup Search Listener
    this.searchControl.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((val) => {
        this.loadInitialPosts(val || undefined);
      });
  }

  loadInitialPosts(searchString?: string) {
    this.store.dispatch(
      PostActions.findAllPosts({
        query: {
          limit: 20,
          page: 0,
          searchString,
          relations: ['user', 'likes', 'comments', 'shares'],
        },
      })
    );
  }

  // TODO: Implement Infinite Scroll trigger to call this
  onLoadMore() {
    // Determine the last post id and request older posts (infinite scroll)
    this.posts$.pipe(take(1)).subscribe((posts) => {
      if (!posts || posts.length === 0) return;
      const lastId = posts[posts.length - 1].id;
      const query: LoadMoreDto = {
        loadMoreOptions: { type: LoadType.LT, id: lastId },
        limit: 20,
        relations: ['user', 'likes', 'comments', 'shares'],
      };
      this.store.dispatch(PostActions.loadMorePosts({ query }));
    });
  }

  onPost() {
    if (this.postForm.invalid) return;

    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user) return;

      const dto: CreatePostDto = {
        text: this.postForm.value.text!,
        // Fallback or specific logic for userName/trendorsId generation
        userName: user.user_name || user.first_name,
        userId: user.id,
        channel: Channel.PUBLIC,
        trendorsId: user.trendors_id || 'default_id',
        isSponsored: false,
        images: [], // Future: Add image upload logic
        generate_ai_rewrite: false,
      };

      this.store.dispatch(PostActions.createPost({ dto }));
      this.postForm.reset();
    });
  }

  onLike(postId: number) {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user) return;

      const dto: LikePostDto = {
        postId,
        userId: user.id,
        trendorsId: user.trendors_id || 'default_id',
      };

      this.store.dispatch(PostActions.likePost({ dto }));
    });
  }

  onSubmitPost(): void {
    // Delegate to existing onPost logic which builds the DTO and dispatches
    this.onPost();
  }

  onLikePost(postId: number | string): void {
    if (postId === null || postId === undefined) return;
    const id = typeof postId === 'string' ? Number(postId) : postId;
    if (Number.isNaN(id)) return;
    this.onLike(id);
  }
}
