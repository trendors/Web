import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { PostService } from '../../../core/services/posts/post.service';
import { of } from 'rxjs';
import { mergeMap, map, catchError, switchMap } from 'rxjs/operators';
import { PostActions } from './posts.actions';
import { Post } from '../../../core/models/posts/post.model';

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
          catchError((error) => of(PostActions.findAllPostsFailure({ error: error.message }))),
        ),
      ),
    ),
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
              pagination: response.data!.pagination,
            });
          }),
          catchError((error) =>
            of(PostActions.loadMorePostsFailure({ error: error?.message || 'error loading more' })),
          ),
        ),
      ),
    ),
  );

  createPost$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.createPost),
      mergeMap(({ dto, file }) =>
        this.postsService.create(dto).pipe(
          switchMap((response) => {
            const postId = response.id;

            if (file && postId) {
              return this.postsService.uploadImage(postId, file).pipe(map(() => response));
            }
            return of(response);
          }),
          map((response) =>
            PostActions.createPostSuccess({
              message: response.message,
              post: {} as Post,
            }),
          ),
          catchError((error: Error) => of(PostActions.createPostFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  likePost$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.likePost),
      mergeMap(({ dto }) =>
        this.postsService.likePost(dto).pipe(
          map((response) => {
            // Check for our custom error or FAILED status
            if (response.error || response.status === 'FAILED') {
              return PostActions.likePostFailure({
                error: response.message,
                postId: dto.postId!,
                userId: dto.userId!,
              });
            }
            return PostActions.likePostSuccess({ response });
          }),
          catchError((error) =>
            of(
              PostActions.likePostFailure({
                error: error?.message || 'error liking',
                postId: dto.postId!,
                userId: dto.userId!,
              }),
            ),
          ),
        ),
      ),
    ),
  );

  addComment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.addComment),
      mergeMap(({ dto }) =>
        this.postsService.addComment(dto).pipe(
          map((response) => {
            if (response.error || response.status === 'FAILED') {
              return PostActions.addCommentFailure({ error: response.message });
            }
            // Dispatches success, passing the fully populated comment from the backend
            return PostActions.addCommentSuccess({ response });
          }),
          catchError((error) =>
            of(PostActions.addCommentFailure({ error: error.message || 'Error adding comment' })),
          ),
        ),
      ),
    ),
  );

  editComment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.editComment),
      mergeMap(({ payload }) =>
        this.postsService.updateComment(payload.commentId, payload.dto).pipe(
          map((response) => {
            if (response.error || response.status === 'FAILED') {
              return PostActions.editCommentFailure({ error: response.message });
            }
            return PostActions.editCommentSuccess({ response });
          }),
          catchError((error) =>
            of(PostActions.editCommentFailure({ error: error.message || 'Error editing comment' }))
          )
        )
      )
    )
  );

  deleteComment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.deleteComment),
      mergeMap(({ payload }) =>
        this.postsService.removeComment(payload.commentId, payload.userId).pipe(
          map((response) => {
            if (response.error || response.status === 'FAILED') {
              return PostActions.deleteCommentFailure({ error: response.message });
            }
            // Pass back the IDs so the reducer knows which comment to remove
            return PostActions.deleteCommentSuccess({ 
              commentId: payload.commentId, 
              postId: payload.postId 
            });
          }),
          catchError((error) =>
            of(PostActions.deleteCommentFailure({ error: error.message || 'Error deleting comment' }))
          )
        )
      )
    )
  );

  refreshAfterCreate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PostActions.createPostSuccess),
      map(() =>
        PostActions.findAllPosts({
          query: { limit: 20, page: 0, relations: ['user', 'likes', 'comments', 'shares'] },
        }),
      ),
    ),
  );
}
