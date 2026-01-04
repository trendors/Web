import { createActionGroup, props } from '@ngrx/store';
import { CreatePostDto, FetchPostsDto, Post } from '../../../core/models/posts/post.model';

export const PostActions = createActionGroup({
  source: 'Home Feed',
  events: {
    'Load Feed': props<{ query: FetchPostsDto }>(),
    'Load Feed Success': props<{ posts: Post[]; count: number }>(),
    'Load Feed Failure': props<{ error: string }>(),

    'Create Post': props<{ data: CreatePostDto }>(),
    'Create Post Success': props<{ post: Post }>(),
    'Create Post Failure': props<{ error: string }>(),

    'Like Post': props<{ postId: number; userId: number }>(),
    'Like Post Success': props<{ postId: number }>(),
    'Like Post Failure': props<{ error: string }>(),
  },
});
