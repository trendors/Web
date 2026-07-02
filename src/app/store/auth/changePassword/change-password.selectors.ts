import { createFeature, createReducer, on } from '@ngrx/store';
import { PasswordChangeActions } from './change-password.actions';

export interface AuthState {
  isLoading: boolean;
  error: string | null;
  userId: number; // Assuming you store it directly here
}

export const initialState: AuthState = {
  isLoading: false,
  error: null,
  userId: 0
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,
    on(PasswordChangeActions.changePasswordRequest, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(PasswordChangeActions.changePasswordSuccess, (state) => ({
      ...state,
      isLoading: false,
    })),
    on(PasswordChangeActions.changePasswordFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    }))
  ),
});

// Auto-generated selectors you can export and use instantly:
// authFeature.selectIsLoading
// authFeature.selectError
// authFeature.selectUserId