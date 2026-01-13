import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  postForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(3)]],
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

  onLoadMore() {
    this.posts$.pipe(take(1)).subscribe((posts) => {
      if (!posts || posts.length === 0) return;

      const lastPost = posts[posts.length - 1].id;
      const query: LoadMoreDto = {
        loadMoreOptions: { type: LoadType.LT, id: lastPost },
        limit: 20,
        relations: ['user', 'likes', 'comments', 'shares'],
      };
      this.store.dispatch(PostActions.loadMorePosts({ query }));
    });
  }

  onSubmitPost() {
    if (this.postForm.invalid) return;

    this.user$.pipe(take(1)).subscribe((user) => {
      console.log('Submitting post', user);
      if (!user) return;

      const dto: CreatePostDto = {
        text: this.postForm.value.text!,
        userName: user.user_name || `${user.first_name}_${user.last_name}`,
        userId: user.id,
        channel: Channel.PUBLIC,
        trendorsId: user.trendors_id || 'default_id',
        isSponsored: false,
        images: [],
        generate_ai_rewrite: false,
        heading: '',
        link: '',
        srcUrl: '',
        srcName: '',
        srcImgUrl: '',
        incentiveShareCount: 0,
        maxIncentiveShares: 0,
      };

      this.store.dispatch(PostActions.createPost({ dto, file: this.selectedFile || undefined }));
      this.postForm.reset();
      this.removeSelectedImage();
    });
  }

  onLikePost(postId: number) {
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage() {
    this.selectedFile = null;
    this.imagePreview = null;
  }
}
