import { createReducer, on } from "@ngrx/store";
import { Share } from "../../core/models/shares/shares.model";
import { SharesActions } from "./shares.action";

export const sharesFeatureKey = 'shares';

export interface SharesState {
  list: Share[];
  filter: 'all' | 'paid' | 'free' | 'pending' | 'claimed';
  isLoading: boolean;
  error: string | null;
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
    on(SharesActions.loadSharesFailure, (state, { error }) => ({ ...state, isLoading: false, error })),
    on(SharesActions.setFilter, (state, { filter }) => ({ ...state, filter })),
);