import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, CommonModule, SlicePipe, UpperCasePipe, ViewportScroller } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { PostActions } from '../../../store/posts/post/posts.actions';
import {
  selectAllPosts,
  selectIsLoadingMore,
  selectIsLoadingPosts,
} from '../../../store/posts/post/posts.selectors';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
  take,
  takeUntil,
} from 'rxjs';
import {
  CreatePostDto,
  Channel,
  LikePostDto,
  LoadType,
  LoadMoreDto,
  Post,
  CreateCommentDto,
  DeleteCommentPayload,
  EditCommentPayload,
  Comment,
} from '../../../core/models/posts/post.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ShareSheet } from '../../../components/share-sheet/share-sheet';
import { Router, RouterLink } from '@angular/router';
import { ButtomNav } from "../../../components/buttom-nav/buttom-nav";
import { TopNavFilter } from "../../../components/top-nav-filter/top-nav-filter";
import { UserInfoCard } from "../../../components/user-info-card/user-info-card";
import { NewPostsNotifier } from "../../../components/new-posts-notifier/new-posts-notifier";
import { Fab } from "../../../components/fab/fab";
import { SocketService } from '../../../socket.service';
import { LoaderComponent } from "../../../components/loader/loader";

@Component({
  selector: 'app-home',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    AsyncPipe,
    SlicePipe,
    TopNavFilter,
    UserInfoCard,
    NewPostsNotifier,
    Fab,
    LoaderComponent,
    FormsModule,
  ],
  standalone: true,
  templateUrl: './posts.html',
  styleUrl: './posts.scss',
})
export class Posts implements OnInit, OnDestroy {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private socketService = inject(SocketService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  posts$ = this.store.select(selectAllPosts);
  loading$ = this.store.select(selectIsLoadingPosts);
  loadingMore$ = this.store.select(selectIsLoadingMore);
  user$ = this.store.select(selectCurrentUser);
  newPostsAvailable: boolean = false;
  pendingPosts: any[] = [];

  filteredPosts$: Observable<Post[]> = new Observable<Post[]>();

  searchControl = new FormControl('', { nonNullable: true });
  private searchQuery$ = new BehaviorSubject<string>('');

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  currentUserId: number | undefined;
  currentTrendorsId: string | undefined;
  currentUserName: string | undefined;
  editingCommentId: number | null = null;
  editCommentText: string = '';

  newCommentTexts: { [postId: number]: string } = {};
  expandedComments: { [postId: number]: boolean } = {};
  visibleCommentsCount: { [postId: number]: number } = {};

  postForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(3)]],
  });

  constructor() {
    // Initialize filtered posts combining posts$ with search query
    this.filteredPosts$ = combineLatest([this.posts$, this.searchQuery$]).pipe(
      map(([posts, searchQuery]) => this.filterPosts(posts, searchQuery)),
    );
  }

  ngOnInit() {
    this.loadInitialPosts();
    this.listenForNewPosts();

    this.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.currentUserId = user?.id;
      this.currentTrendorsId = user?.trendors_id;
      this.currentUserName = user?.user_name || `${user?.first_name}_${user?.last_name}`;
    });

    // Setup Search Listener with debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchValue) => {
        console.log('🔍 Search value changed:', searchValue);
        this.onSearchChange(searchValue);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchQuery$.next(value);
  }

  private filterPosts(posts: Post[], searchQuery: string): Post[] {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (!normalizedSearch) {
      return posts; // Return all posts if search is empty
    }

    return posts.filter((post) => {
      const matchesText = post.text.toLowerCase().includes(normalizedSearch);
      const matchesHeading = post.heading?.toLowerCase().includes(normalizedSearch) ?? false;
      const matchesUserName = post.userName?.toLowerCase().includes(normalizedSearch) ?? false;

      return matchesText || matchesHeading || matchesUserName;
    });
  }

  refreshPosts() {
    this.newPostsAvailable = false;
    this.loadInitialPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  listenForNewPosts() {
    this.socketService.listenToNewPosts().subscribe((post) => {
      this.ngZone.run(() => {
        this.cdr.markForCheck();
        this.pendingPosts.push(post);
        console.log('New post received via socket:', this.pendingPosts);
        this.newPostsAvailable = true;
      });
    });
  }

  isLikedByCurrentUser(post: Post): boolean {
    if (!this.currentUserId || !post.likes) return false;
    return post.likes.some((like) => like.userId === this.currentUserId);
  }

  loadInitialPosts(searchString?: string) {
    console.log('🔍 Loading posts with search:', searchString);
    this.store.dispatch(
      PostActions.findAllPosts({
        query: {
          limit: 20,
          page: 0,
          searchString,
          relations: ['user', 'likes', 'comments', 'shares'],
        },
      }),
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
      if (!user?.id) {
        console.warn('⚠️ No user found');
        return;
      }
      const dto: CreatePostDto = {
        text: this.postForm.value.text || '',
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

      console.log('📝 Creating post:', dto);
      this.store.dispatch(PostActions.createPost({ dto, file: this.selectedFile || undefined }));
      this.postForm.reset();
      this.removeSelectedImage();
    });
  }

  onLikePost(postId: number) {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user?.id) {
        console.warn('⚠️ No user found for like action');
        return;
      }

      const dto: LikePostDto = {
        postId,
        userId: user.id,
        trendorsId: user.trendors_id || 'default_id',
      };

      console.log('❤️ Liking post:', dto);
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

  openShareMenu(post: Post): void {
    this.bottomSheet.open(ShareSheet, {
      data: { post },
      panelClass: 'custom-share-sheet',
    });
  }

  routeTo(path: string) {
    this.router.navigate([path]);
  }

  trackById(_index: number, post: Post) {
    return post.id;
  }

  // comment

  isCommentOwner(commentUserId: number): boolean {
    return this.currentUserId === commentUserId;
  }

  // Starts the inline edit mode
  startEditComment(comment: Comment) {
    this.editingCommentId = comment.id;
    this.editCommentText = comment.text;
  }

  cancelEditComment() {
    this.editingCommentId = null;
    this.editCommentText = '';
  }

  submitEditComment(postId: number) {
    if (!this.editingCommentId || !this.editCommentText.trim()) return;

    const payload: EditCommentPayload = {
      commentId: this.editingCommentId,
      postId: postId,
      dto: { text: this.editCommentText.trim() },
    };

    this.store.dispatch(PostActions.editComment({ payload }));
    this.cancelEditComment(); // Instantly close the edit box
  }

  onDeleteComment(commentId: number, postId: number) {
    if (!this.currentUserId) return;

    if (confirm('Are you sure you want to delete this comment?')) {
      const payload: DeleteCommentPayload = {
        commentId,
        postId,
        userId: this.currentUserId,
      };

      this.store.dispatch(PostActions.deleteComment({ payload }));
    }
  }

  toggleComments(postId: number) {
    this.expandedComments[postId] = !this.expandedComments[postId];
  }

  toggleShowAllComments(postId: number, totalCount: number) {
    const current = this.visibleCommentsCount[postId] || 3;
    // If already expanded, collapse back to 3; otherwise show all
    this.visibleCommentsCount[postId] = current <= 3 ? totalCount : 3;
  }

  submitComment(postId: number) {
    const text = this.newCommentTexts[postId]?.trim();

    if (!text || !this.currentUserId || !this.currentTrendorsId || !this.currentUserName) return;

    const dto: CreateCommentDto = {
      text: text,
      postId: postId,
      userId: this.currentUserId,
      trendorsId: this.currentTrendorsId,
      userName: this.currentUserName,
    };

    this.store.dispatch(PostActions.addComment({ dto }));

    this.newCommentTexts[postId] = '';
  }
}