import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PostService } from '../../../core/services/posts/post.service';
import { of } from 'rxjs';
import { mergeMap, map, catchError, switchMap } from 'rxjs/operators';
import { PostActions } from './posts.actions';

@Injectable()
export class PostsEffects {
  private actions$ = inject(Actions);
  private postsService = inject(PostService);

  findAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.findAllPosts),
      mergeMap(({ query }) =>
        this.postsService.findAll(query).pipe(
          map((response) => {
            if (response.status !== 'SUCCESS') {
              return PostActions.findAllPostsFailure({
                error: response.message || 'Failed to fetch posts',
              });
            }
            return PostActions.findAllPostsSuccess({
              list: response.data!.list,
              pagination: response.data!.pagination,
            });
          }),
          catchError((error) => of(PostActions.findAllPostsFailure({ error: error.message })))
        )
      )
    )
  );

  loadMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.loadMorePosts),
      mergeMap(({ query }) =>
        this.postsService.loadMore(query).pipe(
          map((response) => {
            if (response.status !== 'SUCCESS') {
              return PostActions.loadMorePostsFailure({
                error: response.message || 'Failed to load more posts',
              });
            }
            return PostActions.loadMorePostsSuccess({ 
              list: response.data!.list, 
              pagination: response.data!.pagination });
          }),
          catchError((error) =>
            of(PostActions.loadMorePostsFailure({ error: error?.message || 'error loading more' }))
          )
        )
      )
    )
  );

  createPost$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.createPost),
      mergeMap(({ dto, file }) =>
        this.postsService.create(dto).pipe(
          switchMap(response => {
            const postId = response.id;

            if (file && postId) {
              return this.postsService.uploadImage(postId, file).pipe(
                map(() => response)
              );
            }
            return of(response);
          }),
          map(response => {
            return [
              PostActions.createPostSuccess({ message: response.message }),
                PostActions.findAllPosts({ query: { limit: 20, page: 0, relations: ['user', 'likes', 'comments', 'shares'] } })
            ];
          }),
          mergeMap(actions => actions),
          catchError((error) =>
            of(PostActions.createPostFailure({ error: error.message || 'error creating post' }))
          )
        )
      )
    )
  );

  likePost$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.likePost),
      mergeMap(({ dto }) =>
        this.postsService.likePost(dto).pipe(
          map((response) => {
            if (response.error) {
                return PostActions.likePostFailure({ error: response.message, postId: dto.postId!, userId: dto.userId! });
             }
            return PostActions.likePostSuccess({ message: response.message, data: response.data });
          }),
          catchError((error) =>
            of(PostActions.likePostFailure({ error: error?.message || 'error liking', postId: dto.postId!, userId: dto.userId! }))
          )
        )
      )
    )
  );
}
