import { createFeatureSelector, createSelector } from '@ngrx/store';
import { authFeatureKey, AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectCurrentUser = createSelector(selectAuthState, (state) => state.user);

export const selectIsLoggedIn = createSelector(selectAuthState, (state) => !!state.token);

export const selectIsLoading = createSelector(selectAuthState, (state) => state.isLoading);

export const selectAuthError = createSelector(selectAuthState, (state) => state.error);
