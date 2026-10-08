import { combineReducers } from '@ngrx/store';
import { clearStateOnLogout } from './clear-state.meta-reducer';
import { logoutUser } from './auth/logout/logout.action';
import { postsReducer, initialState as postsInitial } from './posts/post/posts.reducer';
import { userReducer, initialState as userInitial } from './user/user.reducer';

describe('clearStateOnLogout', () => {
  it('resets every slice to its initial state on logout', () => {
    const reducer = clearStateOnLogout(combineReducers({ posts: postsReducer, user: userReducer }));
    const dirty = {
      posts: { ...postsInitial, list: [{ id: 1 } as any] },
      user: { ...userInitial, currentUser: { id: 1 } as any },
    };
    const next = reducer(dirty, logoutUser());
    expect(next.posts).toEqual(postsInitial);
    expect(next.user).toEqual(userInitial);
  });

  it('leaves state alone for other actions', () => {
    const reducer = clearStateOnLogout(combineReducers({ posts: postsReducer }));
    const dirty = { posts: { ...postsInitial, list: [{ id: 1 } as any] } };
    expect(reducer(dirty, { type: 'noop' }).posts.list).toHaveLength(1);
  });
});
