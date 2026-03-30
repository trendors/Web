import { createReducer, on } from '@ngrx/store';
import { UserAction } from './user.action';
import { updateCurrentUser } from '../auth/login/login.actions';
import { User } from '../../core/models/users/user.model';

export const userFeatureKey = 'user';

export interface UserState {
  isLoading: boolean;
  error: string | null;
  currentUser?: User | null;
}

export const initialState: UserState = {
  isLoading: false,
  error: null,
  currentUser: null,
};

export const userReducer = createReducer(
  initialState,
  on(UserAction.updateUser, (state) => ({ ...state, isLoading: true, error: null })),
  on(UserAction.updateUserSuccess, (state, { user }) => ({
    ...state, isLoading: false, currentUser: user,
  })),
  on(UserAction.updateUserFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
  on(UserAction.deleteUser, (state) => ({ ...state, isLoading: true, error: null })),
  on(UserAction.deleteUserSuccess, (state) => ({ ...state, isLoading: false })),
  on(UserAction.deleteUserFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
  on(updateCurrentUser, (state, { user }) => {
    console.log('Reducer updating user:', user);
    return {
      ...state,
      currentUser: user
    };
  })
);
