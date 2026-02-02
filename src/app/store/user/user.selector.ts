import { createFeatureSelector, createSelector } from "@ngrx/store";
import { UserState, userFeatureKey } from "./user.reducer";

export const selectUserState = createFeatureSelector<UserState>(userFeatureKey);
export const selectUserIsLoading = createSelector(selectUserState, (state) => state.isLoading);
export const selectUserError = createSelector(selectUserState, (state) => state.error);