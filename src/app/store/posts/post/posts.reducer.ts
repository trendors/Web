import { createReducer, on } from '@ngrx/store';
import { FetchPostDto, LikePost, Post } from '../../../core/models/posts/post.model';
import { PostActions } from './posts.actions';

export const postsFeatureKey = 'posts';

export interface PostsState {
  list: Post[];
  /** Query behind `list`; load-more and post-create refreshes reuse it. */
  query: FetchPostDto | null;
  page: number;
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

export const initialState: PostsState = {
  list: [],
  query: null,
  page: 0,
  totalCount: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
};

function withLikes(state: PostsState, postId: number | undefined, update: (likes: LikePost[]) => LikePost[]): PostsState {
  return {
    ...state,
    list: state.list.map((post) =>
      post.id === postId ? { ...post, likes: update(post.likes || []) } : post,
    ),
  };
}

function optimisticLike(postId: number | undefined, userId: number | undefined, trendorsId: string): LikePost {
  return {
    id: 0, // replaced by the real id on success
    trendorsId,
    userId: userId!,
    postId: postId!,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LikePost;
}

export const postsReducer = createReducer(
  initialState,

  on(PostActions.findAllPosts, (state, { query }) => ({
    ...state,
    query,
    page: query.page ?? 0,
    loading: true,
    error: null,
  })),
  on(PostActions.findAllPostsSuccess, (state, { list, pagination }) => ({
    ...state,
    list,
    totalCount: pagination?.total_items ?? list.length,
    hasMore: list.length < (pagination?.total_items ?? 0),
    loading: false,
  })),
  on(PostActions.findAllPostsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  on(PostActions.loadMorePosts, (state) => ({ ...state, loadingMore: true, error: null })),
  on(PostActions.loadMorePostsSuccess, (state, { list, pagination }) => {
    // De-dupe in case new posts shifted the page window between requests.
    const seen = new Set(state.list.map((p) => p.id));
    const merged = [...state.list, ...list.filter((p) => !seen.has(p.id))];
    const total = pagination?.total_items ?? merged.length;
    return {
      ...state,
      list: merged,
      page: state.page + 1,
      totalCount: total,
      hasMore: list.length > 0 && merged.length < total,
      loadingMore: false,
    };
  }),
  on(PostActions.loadMorePostsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingMore: false,
  })),

  on(PostActions.createPostFailure, (state, { error }) => ({ ...state, error })),

  // Optimistic toggle; the component tells us which way it is going.
  on(PostActions.likePost, (state, { dto, wasLiked }) =>
    withLikes(state, dto.postId, (likes) =>
      wasLiked
        ? likes.filter((l) => l.userId !== dto.userId)
        : [...likes, optimisticLike(dto.postId, dto.userId, dto.trendorsId)],
    ),
  ),

  // Restore exactly the pre-click state, in either direction.
  on(PostActions.likePostFailure, (state, { error, postId, userId, trendorsId, wasLiked }) => ({
    ...withLikes(state, postId, (likes) => {
      const withoutMine = likes.filter((l) => l.userId !== userId);
      return wasLiked ? [...withoutMine, optimisticLike(postId, userId, trendorsId)] : withoutMine;
    }),
    error,
  })),

  on(PostActions.likePostSuccess, (state, { response }) => {
    const realLike = response.data?.like;
    if (response.data?.action !== 'liked' || !realLike) return state;
    return withLikes(state, realLike.postId, (likes) =>
      likes.map((l) => (l.userId === realLike.userId ? realLike : l)),
    );
  }),

  on(PostActions.addCommentSuccess, (state, { response }) => {
    const newComment = response.data;
    return {
      ...state,
      list: state.list.map((post) =>
        post.id === newComment.postId
          ? { ...post, comments: [...(post.comments || []), newComment] }
          : post,
      ),
    };
  }),

  on(PostActions.editCommentSuccess, (state, { response }) => {
    const updated = response.data;
    return {
      ...state,
      list: state.list.map((post) =>
        post.id === updated.postId
          ? { ...post, comments: post.comments?.map((c) => (c.id === updated.id ? updated : c)) }
          : post,
      ),
    };
  }),

  on(PostActions.deleteCommentSuccess, (state, { commentId, postId }) => ({
    ...state,
    list: state.list.map((post) =>
      post.id === postId
        ? { ...post, comments: post.comments?.filter((c) => c.id !== commentId) }
        : post,
    ),
  })),
);
