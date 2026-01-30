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
  on(PostActions.createPostSuccess, (state) => ({ ...state, loading: false })),
  on(PostActions.createPostFailure, (state, { error }) => ({ ...state, loading: false, error })),

  on(PostActions.likePost, (state, { dto }) => {
    const updatedList = state.list.map((post) => {
      if (post.id === dto.postId) {
        const optimisticLike: LikePost = {
          id: 0,
          trendorsId: dto.trendorsId,
          userId: dto.userId,
          postId: dto.postId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const currentLikes = post.likes || [];
        return { ...post, likes: [...currentLikes, optimisticLike] };
      }
      return post;
    });
    return { ...state, list: updatedList };
  }),

  on(PostActions.likePostFailure, (state, { error, postId, userId }) => {
    const updatedList = state.list.map((post) => {
      if (post.id === postId) {
        const currentLikes = post.likes || [];
        const newLikes = currentLikes.filter((l) => l.userId !== userId);
        return { ...post, likes: newLikes };
      }
      return post;
    });
    return { ...state, list: updatedList, error };
  }),

  on(PostActions.likePostSuccess, (state, { data }) => {
    const updatedList = state.list.map((post) => {
      if (post.id === data.postId) {
        const currentLikes = post.likes || [];
        const cleanLikes = currentLikes.filter((l) => l.id !== 0);
        return { ...post, likes: [...cleanLikes, data] };
      }
      return post;
    });
    return { ...state, list: updatedList };
  })
);
