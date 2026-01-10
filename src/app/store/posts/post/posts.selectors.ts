import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PostsState } from './posts.reducer';

export const selectPostsState = createFeatureSelector<PostsState>('posts');
export const selectAllPosts = createSelector(selectPostsState, (state) => state.list);
export const selectIsLoadingPosts = createSelector(selectPostsState, (state) => state.loading);
export const selectIsLoadingMore = createSelector(selectPostsState, (state) => state.loadingMore);