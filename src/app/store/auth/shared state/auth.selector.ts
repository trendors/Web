import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '../../../core/models/users/user.model';
import * as fromAuth from '../shared state/auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(fromAuth.authFeatureKey);

export const selectUser = createSelector(
  selectAuthState,
  (state) => state.user
);

export const selectToken = createSelector(
    selectAuthState,
    (state) => state.token
);

export const selectIsLoggedIn = createSelector(
    selectAuthState,
    (state) => state.isLoggedIn
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

export const selectAuthError = createSelector(
    selectAuthState,
    (state) => state.error
)

export const selectUserId = createSelector(
  selectUser,
  (user) => user ? user.email : null
);