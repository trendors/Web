import { createActionGroup, props } from '@ngrx/store';
import {
  CreatePostDto,
  FetchPostDto,
  LikePostDto,
  LoadMoreDto,
  Post,
} from '../../../core/models/posts/post.model';

export const PostActions = createActionGroup({
  source: 'Posts API',
  events: {
    'Find All Posts': props<{ query: FetchPostDto }>(),
    'Find All Posts Success': props<{ list: Post[]; count: number }>(),
    'Find All Posts Failure': props<{ error: string }>(),

    'Load More Posts': props<{ query: LoadMoreDto }>(),
    'Load More Posts Success': props<{ list: Post[]; count: number }>(),
    'Load More Posts Failure': props<{ error: string }>(),

    'Create Post': props<{ dto: CreatePostDto }>(),
    'Create Post Success': props<{ message: string }>(),
    'Create Post Failure': props<{ error: string }>(),

    'Like Post': props<{ dto: LikePostDto }>(),
    'Like Post Success': props<{ message: string; postId: number }>(),
    'Like Post Failure': props<{ error: string }>(),
  },
});
