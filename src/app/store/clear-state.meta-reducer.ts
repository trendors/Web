import { ActionReducer } from '@ngrx/store';
import { logoutUser } from './auth/logout/logout.action';

/**
 * Logout resets every feature slice, so the next account signed in on this
 * browser never sees the previous user's posts, wallet data or notifications.
 */
export function clearStateOnLogout(reducer: ActionReducer<any>): ActionReducer<any> {
  return (state, action) => reducer(action.type === logoutUser.type ? undefined : state, action);
}
