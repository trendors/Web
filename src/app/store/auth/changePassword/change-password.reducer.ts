import { createReducer, on } from '@ngrx/store';
import { PasswordChangeActions } from './change-password.actions';

export interface AuthState {
  isLoading: boolean;
  error: string | null;
  // ... your other state properties (e.g., user)
}

export const initialState: AuthState = {
  isLoading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  
  // 1. When the request starts, set loading to true and clear past errors
  on(PasswordChangeActions.changePasswordRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  // 2. On success, stop the loading spinner
  on(PasswordChangeActions.changePasswordSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),

  // 3. On failure, stop loading and save the error message
  on(PasswordChangeActions.changePasswordFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error,
  }))
);