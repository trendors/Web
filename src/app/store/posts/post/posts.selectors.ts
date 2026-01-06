import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PostsState } from './posts.reducer';

export const selectPostsState = createFeatureSelector<PostsState>('posts');
export const selectAllPosts = createSelector(selectPostsState, s => s.list);
export const selectIsLoadingPosts = createSelector(selectPostsState, s => s.loading);
export const selectIsLoadingMore = createSelector(selectPostsState, s => s.loadingMore);