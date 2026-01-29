import { createActionGroup, props } from '@ngrx/store';
import {
  CreatePostDto,
  FetchPostDto,
  LikePost,
  LikePostDto,
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

    'Find One Post': props<{ id: number}>(),
    'Find One Post Success': props <{message:any}> (),
    'Find One Post Failure': props <{message:any}> (),


    'Load More Posts': props<{ query: LoadMoreDto }>(),
    'Load More Posts Success': props<{ list: Post[]; pagination: Pagination }>(),
    'Load More Posts Failure': props<{ error: string }>(),

    'Create Post': props<{ dto: CreatePostDto; file?: File }>(),
    'Create Post Success': props<{ message: string }>(),
    'Create Post Failure': props<{ error: string }>(),

    'Like Post': props<{ dto: LikePostDto }>(),
    'Like Post Success': props<{ message: string; data: LikePost }>(),
    'Like Post Failure': props<{ error: string; postId: number; userId: number }>(),

  },
});
