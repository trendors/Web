import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PostService } from '../../../core/services/posts/post.service';
import { of, from } from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
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
              return PostActions.findAllPostsFailure({ error: response.message });
            }
            const list = response.data?.list || [];
            const count = response.data?.pagination?.total_items ?? list.length;
            return PostActions.findAllPostsSuccess({ list, count });
          }),
          catchError((error) =>
            of(PostActions.findAllPostsFailure({ error: error?.message || 'error searching' }))
          )
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
              return PostActions.loadMorePostsFailure({ error: response.message });
            }
            const list = response.data?.list || [];
            const count = response.data?.pagination?.total_items ?? list.length;
            return PostActions.loadMorePostsSuccess({ list, count });
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
      mergeMap(({ dto }) =>
        this.postsService.create(dto).pipe(
          mergeMap((response) => {
            if (response.status !== 'SUCCESS') {
              return of(PostActions.createPostFailure({ error: response.message }));
            }
            return from([
              PostActions.createPostSuccess({ message: response.message }),
              PostActions.findAllPosts({
                query: { limit: 20, page: 0, relations: ['user', 'likes', 'comments', 'shares'] },
              }),
            ]);
          }),
          catchError((error) =>
            of(PostActions.createPostFailure({ error: error?.message || 'error creating post' }))
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
            if (response.status !== 'SUCCESS') {
              return PostActions.likePostFailure({ error: response.message });
            }
            return PostActions.likePostSuccess({ message: response.message, postId: dto.postId! });
          }),
          catchError((error) =>
            of(PostActions.likePostFailure({ error: error?.message || 'error liking' }))
          )
        )
      )
    )
  );
}
