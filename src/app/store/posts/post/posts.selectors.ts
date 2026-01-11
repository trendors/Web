import { createFeatureSelector, createSelector } from '@ngrx/store';
import { postsFeatureKey, PostsState } from './posts.reducer';

export const selectPostsState = createFeatureSelector<PostsState>(postsFeatureKey);
export const selectAllPosts = createSelector(selectPostsState, (state) => state.list);
export const selectIsLoadingPosts = createSelector(selectPostsState, (state) => state.loading);
export const selectIsLoadingMore = createSelector(selectPostsState, (state) => state.loadingMore);