import { createReducer, on } from '@ngrx/store';
import { LikePost, Post } from '../../../core/models/posts/post.model';
import { PostActions } from './posts.actions';

export const postsFeatureKey = 'posts';

export interface PostsState {
  list: Post[];
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

export const initialState: PostsState = {
  list: [],
  totalCount: 0,
  loading: false,
  loadingMore: false,
  error: null,
};

export const postsReducer = createReducer(
  initialState,

  on(PostActions.findAllPosts, (state) => ({ ...state, loading: true, error: null })),
  on(PostActions.findAllPostsSuccess, (state, { list, pagination }) => ({
    ...state,
    list,
    pagination,
    loading: false,
  })),
  on(PostActions.findAllPostsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  on(PostActions.loadMorePosts, (state) => ({ ...state, loadingMore: true, error: null })),
  on(PostActions.loadMorePostsSuccess, (state, { list, pagination }) => ({
    ...state,
    list: [...state.list, ...list],
    pagination,
    loadingMore: false,
  })),
  on(PostActions.loadMorePostsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingMore: false,
  })),

  on(PostActions.createPost, (state) => ({ ...state, loading: true, error: null })),
  on(PostActions.createPostSuccess, (state, { post }) => ({
    ...state,
    list: [post, ...state.list],
    loading: false,
  })),
  on(PostActions.createPostFailure, (state, { error }) => ({ ...state, loading: false, error })),

  // 1. Instantly update UI when button is clicked (Optimistic)
  on(PostActions.likePost, (state, { dto }) => {
    const updatedList = state.list.map((post) => {
      if (post.id === dto.postId) {
        const currentLikes = post.likes || [];
        const isAlreadyLiked = currentLikes.some((l) => l.userId === dto.userId);

        if (isAlreadyLiked) {
          // Optimistically UNLIKE (remove from array)
          return { ...post, likes: currentLikes.filter((l) => l.userId !== dto.userId) };
        } else {
          // Optimistically LIKE (add to array with fake ID)
          const optimisticLike: LikePost = {
            id: 0, // Fake ID
            trendorsId: dto.trendorsId,
            userId: dto.userId,
            postId: dto.postId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return { ...post, likes: [...currentLikes, optimisticLike] };
        }
      }
      return post;
    });
    return { ...state, list: updatedList };
  }),

  // 2. If backend fails, revert the action
  on(PostActions.likePostFailure, (state, { error, postId, userId }) => {
    const updatedList = state.list.map((post) => {
      if (post.id === postId) {
        const currentLikes = post.likes || [];
        const wasLiked = currentLikes.some((l) => l.userId === userId);

        // Toggle it back to whatever it was before
        if (wasLiked) {
          return { ...post, likes: currentLikes.filter((l) => l.userId !== userId) };
        } else {
          // We'd need the trendorsId to perfectly reconstruct it, but a basic revert
          // for the failure edge-case keeps the UI from breaking.
          return post;
        }
      }
      return post;
    });
    return { ...state, list: updatedList, error };
  }),

  // 3. On success, just swap the fake ID for the real database ID
  on(PostActions.likePostSuccess, (state, { response }) => {
    if (response.data.action === 'liked' && response.data.like) {
      const realLike = response.data.like;
      const updatedList = state.list.map((post) => {
        if (post.id === realLike.postId) {
          const currentLikes = post.likes || [];
          // Replace the optimistic like (id: 0) with the real one
          const cleanedLikes = currentLikes.map((l) =>
            l.userId === realLike.userId ? realLike : l,
          );
          return { ...post, likes: cleanedLikes };
        }
        return post;
      });
      return { ...state, list: updatedList };
    }
    // If action was 'unliked', our optimistic UI already removed it perfectly.
    return state;
  }),

  on(PostActions.addCommentSuccess, (state, { response }) => {
    const newComment = response.data;

    // Map through the posts to find the one that matches the comment's postId
    const updatedList = state.list.map((post) => {
      if (post.id === newComment.postId) {
        // Clone the post and append the new comment to its existing comments array
        return {
          ...post,
          comments: [...(post.comments || []), newComment],
        };
      }
      return post;
    });

    return { ...state, list: updatedList };
  }),
);
