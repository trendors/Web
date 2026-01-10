import { createReducer, on } from '@ngrx/store';
import { Post } from '../../../core/models/posts/post.model';
import { PostActions } from './posts.actions';

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
  on(PostActions.findAllPostsSuccess, (state, { list, count }) => ({
    ...state,
    list,
    totalCount: count,
    loading: false,
  })),
  on(PostActions.findAllPostsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  on(PostActions.loadMorePosts, (state) => ({ ...state, loadingMore: true, error: null })),
  on(PostActions.loadMorePostsSuccess, (state, { list, count }) => ({
    ...state,
    list: [...state.list, ...list],
    totalCount: count,
    loadingMore: false,
  })),
  on(PostActions.loadMorePostsFailure, (state, { error }) => ({
    ...state,
    error,
    loadingMore: false,
  })),

  on(PostActions.createPost, (state) => ({ ...state, loading: true, error: null })),
  on(PostActions.createPostSuccess, (state) => ({ ...state, loading: false })),
  on(PostActions.createPostFailure, (state, { error }) => ({ ...state, loading: false, error }))

);
