import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, SlicePipe } from '@angular/common';
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
  selectHasMorePosts,
  selectIsLoadingMore,
  selectIsLoadingPosts,
  selectPostsError,
} from '../../../store/posts/post/posts.selectors';
import { debounceTime, distinctUntilChanged, Subject, take, takeUntil } from 'rxjs';
import {
  CreatePostDto,
  Channel,
  LikePostDto,
  Post,
  CreateCommentDto,
  DeleteCommentPayload,
  EditCommentPayload,
  Comment,
} from '../../../core/models/posts/post.model';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ShareSheet } from '../../../components/share-sheet/share-sheet';
import { Router } from '@angular/router';
import { NewPostsNotifier } from "../../../components/new-posts-notifier/new-posts-notifier";
import { Fab } from "../../../components/fab/fab";
import { SocketService } from '../../../socket.service';
import { CampaignInfluencerService } from '../../../core/api';
import { ToastService } from '../../../components/toast/toast.service';
import { extractApiList } from '../../../core/utils/api-response';
import { TimeAgoPipe } from '../../../time-ago-pipe';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, FormsModule, AsyncPipe, SlicePipe, NewPostsNotifier, Fab, TimeAgoPipe],
  templateUrl: './posts.html',
  styleUrl: './posts.scss',
})
export class Posts implements OnInit, OnDestroy {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bottomSheet = inject(MatBottomSheet);
  private socketService = inject(SocketService);
  private campaignInfluencerApi = inject(CampaignInfluencerService);
  private toast = inject(ToastService);
  private destroy$ = new Subject<void>();

  readonly PAGE_SIZE = 20;

  // The feed is the store's list, so likes, comments, edits and new posts
  // (all handled by the posts reducer) show up immediately.
  posts$ = this.store.select(selectAllPosts);
  loading$ = this.store.select(selectIsLoadingPosts);
  loadingMore$ = this.store.select(selectIsLoadingMore);
  hasMore$ = this.store.select(selectHasMorePosts);
  postsError$ = this.store.select(selectPostsError);
  user$ = this.store.select(selectCurrentUser);

  activePostTab: 'open' | 'application' = 'open';
  newPostsAvailable = signal(false);
  pendingPosts = signal<any[]>([]);
  searchControl = new FormControl('', { nonNullable: true });
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  currentUserId: number | undefined;
  currentTrendorsId: string | undefined;
  currentUserName: string | undefined;
  editingCommentId: number | null = null;
  editCommentText: string = '';
  applyingPostIds = new Set<number>();
  /** Campaigns this user already has an assignment on (loaded from the server). */
  appliedCampaignIds = signal(new Set<number>());

  newCommentTexts: { [postId: number]: string } = {};
  expandedComments: { [postId: number]: boolean } = {};
  visibleCommentsCount: { [postId: number]: number } = {};

  postForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit() {
    this.loadInitialPosts();
    this.listenForNewPosts();

    this.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      const changed = user?.id !== this.currentUserId;
      this.currentUserId = user?.id;
      this.currentTrendorsId = user?.trendors_id;
      this.currentUserName = this.userNameOf(user);
      if (changed && user?.id) this.loadAppliedCampaigns(user.id);
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadInitialPosts());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private userNameOf(user: any): string | undefined {
    if (!user) return undefined;
    const first = user.creativeProfile?.first_name ?? '';
    const last = user.creativeProfile?.last_name ?? '';
    return user.user_name || (first || last ? `${first}_${last}` : undefined);
  }

  selectPostTab(tab: 'open' | 'application'): void {
    if (this.activePostTab === tab) return;
    this.activePostTab = tab;
    this.loadInitialPosts();
  }

  refreshPosts() {
    this.newPostsAvailable.set(false);
    this.pendingPosts.set([]);
    this.loadInitialPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  listenForNewPosts() {
    this.socketService
      .listenToNewPosts()
      .pipe(takeUntil(this.destroy$))
      .subscribe((post) => {
        this.pendingPosts.update((list) => [...list, post]);
        this.newPostsAvailable.set(true);
      });
  }

  isLikedByCurrentUser(post: Post): boolean {
    if (!this.currentUserId || !post.likes) return false;
    return post.likes.some((like) => like.userId === this.currentUserId);
  }

  loadInitialPosts() {
    const searchString = this.searchControl.value.trim();
    this.store.dispatch(
      PostActions.findAllPosts({
        query: {
          limit: this.PAGE_SIZE,
          page: 0,
          relations: ['user', 'likes', 'comments', 'shares', 'campaign'],
          campaignType: this.activePostTab,
          ...(searchString ? { searchString } : {}),
        },
      }),
    );
  }

  onLoadMore() {
    this.store.dispatch(PostActions.loadMorePosts());
  }

  onSubmitPost() {
    if (this.postForm.invalid) return;

    this.user$.pipe(take(1)).subscribe((user) => {
      if (!user?.id || !user.trendors_id) {
        this.toast.show('Please log in again to post.', 'error');
        return;
      }
      const dto: CreatePostDto = {
        text: this.postForm.value.text || '',
        userName: this.userNameOf(user) ?? '',
        userId: user.id,
        channel: Channel.PUBLIC,
        trendorsId: user.trendors_id,
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

  onLikePost(post: Post) {
    if (!this.currentUserId || !this.currentTrendorsId) {
      this.toast.show('Please log in to like posts.', 'error');
      return;
    }
    const dto: LikePostDto = {
      postId: post.id,
      userId: this.currentUserId,
      trendorsId: this.currentTrendorsId,
    };
    this.store.dispatch(PostActions.likePost({ dto, wasLiked: this.isLikedByCurrentUser(post) }));
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

  isCommentOwner(commentUserId: number): boolean {
    return this.currentUserId === commentUserId;
  }

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
    this.cancelEditComment();
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

  private campaignIdOf(post: Post): number {
    return Number((post as Record<string, any>)['campaignId'] ?? post.campaign?.id);
  }

  isAppliedByCurrentUser(post: Post): boolean {
    return this.appliedCampaignIds().has(this.campaignIdOf(post));
  }

  /** Seed "Applied" state from the user's existing assignments. */
  private loadAppliedCampaigns(userId: number): void {
    this.campaignInfluencerApi
      .campaignInfluencerControllerFindByUser(userId, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const ids = new Set<number>();
          for (const row of extractApiList(res)) {
            const id = Number(row?.campaign?.id ?? row?.campaignId);
            if (Number.isFinite(id)) ids.add(id);
          }
          this.appliedCampaignIds.set(ids);
        },
        error: (err) => console.error('Failed to load applications', err),
      });
  }

  /** Create a campaign application via POST /campaign-influencer. */
  applyToCampaign(post: Post): void {
    const campaignId = this.campaignIdOf(post);
    if (!Number.isFinite(campaignId)) {
      this.toast.show('This post is not linked to a campaign.', 'error');
      return;
    }
    const userId = this.currentUserId;
    if (userId == null) {
      this.toast.show('Please log in to apply.', 'error');
      return;
    }
    if (this.isAppliedByCurrentUser(post) || this.applyingPostIds.has(post.id)) return;

    this.applyingPostIds.add(post.id);
    this.campaignInfluencerApi
      .campaignInfluencerControllerCreate({ campaignId, userId })
      .subscribe({
        next: () => {
          this.applyingPostIds.delete(post.id);
          this.appliedCampaignIds.update((ids) => new Set(ids).add(campaignId));
          this.toast.show('Application sent to the brand.', 'success');
        },
        error: (err) => {
          console.error('Failed to apply to campaign', err);
          this.applyingPostIds.delete(post.id);
          this.toast.show(err?.error?.message ?? 'Could not send your application.', 'error');
        },
      });
  }
}
