import { createReducer, on } from "@ngrx/store";
import { Share } from "../../core/models/shares/shares.model";
import { SharesActions } from "./shares.action";

export const sharesFeatureKey = 'shares';

export interface SharesState {
  list: Share[];
  filter: 'all' | 'paid' | 'free' | 'pending' | 'claimed';
  isLoading: boolean;
  error: boolean | null;
}

export const initialState: SharesState = {
  list: [],
  filter: 'all',
  error: null,
  isLoading: false,
};

export const sharesReducer = createReducer(
  initialState,
  on(SharesActions.loadShares, (state) => ({ ...state, isLoading: true, error: null })),
  on(SharesActions.loadSharesSuccess, (state, { list }) => ({ ...state, list, isLoading: false })),
  on(SharesActions.loadSharesFailure, (state, { error }) => ({ ...state, isLoading: false, error: true })),
  on(SharesActions.setFilter, (state, { filter }) => ({ ...state, filter })),

  on(SharesActions.createShares, (state) => ({ ...state, isLoading: true, })),
  on(SharesActions.createSharesSuccess, (state) => ({ ...state, error: false })),
  on(SharesActions.createSharesFailure, (state) => ({ ...state, error: true })),

  on(SharesActions.claimShare, (state) => ({ ...state, isLoading: true, })),
  on(SharesActions.claimShareSuccess, (state) => ({ ...state, error: false })),
  on(SharesActions.claimShareFailure, (state) => ({ ...state, error: true }))

);