import { createActionGroup, props } from '@ngrx/store';
import {
  CommentResponse,
  CreateCommentDto,
  CreatePostDto,
  DeleteCommentPayload,
  EditCommentPayload,
  FetchPostDto,
  LikePost,
  LikePostDto,
  LikeResponse,
  LoadMoreDto,
  Pagination,
  Post,
} from '../../../core/models/posts/post.model';

export const PostActions = createActionGroup({
  source: 'Posts API',
  events: {
    'Find All Posts': props<{ query: FetchPostDto }>(),
    'Find All Posts Success': props<{ list: Post[]; pagination: Pagination }>(),
    'Find All Posts Failure': props<{ error: string }>(),

    'Find One Post': props<{ id: number }>(),
    'Find One Post Success': props<{ post: Post }>(),
    'Find One Post Failure': props<{ error: string }>(),

    'Load More Posts': props<{ query: LoadMoreDto }>(),
    'Load More Posts Success': props<{ list: Post[]; pagination: Pagination }>(),
    'Load More Posts Failure': props<{ error: string }>(),

    'Create Post': props<{ dto: CreatePostDto; file?: File }>(),
    'Create Post Success': props<{ message: string; post: Post }>(),
    'Create Post Failure': props<{ error: string }>(),

    'Like Post': props<{ dto: LikePostDto }>(),
    'Like Post Success': props<{ response: LikeResponse }>(),
    'Like Post Failure': props<{ error: string; postId: number; userId: number }>(),

    'Add Comment': props<{ dto: CreateCommentDto }>(),
    'Add Comment Success': props<{ response: CommentResponse }>(),
    'Add Comment Failure': props<{ error: string }>(),

    'Edit Comment': props<{ payload: EditCommentPayload }>(),
    'Edit Comment Success': props<{ response: CommentResponse }>(),
    'Edit Comment Failure': props<{ error: string }>(),

    'Delete Comment': props<{ payload: DeleteCommentPayload }>(),
    'Delete Comment Success': props<{ commentId: number; postId: number }>(),
    'Delete Comment Failure': props<{ error: string }>(),
  },
});
