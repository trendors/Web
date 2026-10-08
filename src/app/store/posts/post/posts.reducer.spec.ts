import { postsReducer, initialState } from './posts.reducer';
import { PostActions } from './posts.actions';
import { Post } from '../../../core/models/posts/post.model';

const post = (id: number, likes: { userId: number }[] = []) =>
  ({ id, text: `p${id}`, likes: likes.map((l, i) => ({ id: i + 1, postId: id, ...l })) }) as unknown as Post;
const pagination = (total: number) => ({ items_per_page: 2, page: 0, total_items: total, total_pages: 0 });

describe('postsReducer', () => {
  it('tracks the query and whether more pages exist', () => {
    let state = postsReducer(initialState, PostActions.findAllPosts({ query: { limit: 2, page: 0, campaignType: 'open' } }));
    state = postsReducer(state, PostActions.findAllPostsSuccess({ list: [post(1), post(2)], pagination: pagination(3) }));
    expect(state.query?.campaignType).toBe('open');
    expect(state.hasMore).toBe(true);

    state = postsReducer(state, PostActions.loadMorePostsSuccess({ list: [post(2), post(3)], pagination: pagination(3) }));
    expect(state.list.map((p) => p.id)).toEqual([1, 2, 3]); // de-duped
    expect(state.page).toBe(1);
    expect(state.hasMore).toBe(false);
  });

  it('restores a like when an optimistic unlike fails', () => {
    const start = { ...initialState, list: [post(1, [{ userId: 7 }])] };
    const dto = { postId: 1, userId: 7, trendorsId: 'TR' };
    let state = postsReducer(start, PostActions.likePost({ dto, wasLiked: true }));
    expect(state.list[0].likes).toHaveLength(0);
    state = postsReducer(
      state,
      PostActions.likePostFailure({ error: 'x', postId: 1, userId: 7, trendorsId: 'TR', wasLiked: true }),
    );
    expect(state.list[0].likes?.map((l) => l.userId)).toEqual([7]);
  });

  it('removes the optimistic like when a like fails', () => {
    const start = { ...initialState, list: [post(1)] };
    const dto = { postId: 1, userId: 7, trendorsId: 'TR' };
    let state = postsReducer(start, PostActions.likePost({ dto, wasLiked: false }));
    expect(state.list[0].likes).toHaveLength(1);
    state = postsReducer(
      state,
      PostActions.likePostFailure({ error: 'x', postId: 1, userId: 7, trendorsId: 'TR', wasLiked: false }),
    );
    expect(state.list[0].likes).toHaveLength(0);
  });
});
