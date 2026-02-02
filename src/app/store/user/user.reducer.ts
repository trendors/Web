import { createReducer, on } from '@ngrx/store';
import { UserAction } from './user.action';

export const userFeatureKey = 'user';

export interface UserState {
  isLoading: boolean;
  error: string | null;
}

export const initialState: UserState = {
  isLoading: false,
  error: null,
};

export const userReducer = createReducer(
  initialState,
  on(UserAction.updateUser, (state) => ({ ...state, isLoading: true, error: null })),
  on(UserAction.updateUserSuccess, (state) => ({ ...state, isLoading: false })),
  on(UserAction.updateUserFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
  on(UserAction.deleteUser, (state) => ({ ...state, isLoading: true, error: null })),
  on(UserAction.deleteUserSuccess, (state) => ({ ...state, isLoading: false })),
  on(UserAction.deleteUserFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
);
