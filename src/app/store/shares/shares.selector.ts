import { createFeatureSelector, createSelector } from '@ngrx/store';
import { sharesFeatureKey, SharesState } from './shares.reducer';

export const selectSharesState = createFeatureSelector<SharesState>(sharesFeatureKey);
export const selectAllShares = createSelector(selectSharesState, (s) => s.list);
export const selectSharesLoading = createSelector(selectSharesState, (s) => s.isLoading);
export const selectSharesFilter = createSelector(selectSharesState, (s) => s.filter);
export const selectFilteredShares = createSelector(
  selectAllShares,
  selectSharesFilter,
  (list, filter) => {
    if (filter === 'all') return list;
    if (filter === 'paid')
      return list.filter((s) => (!s.paid && s.rewardAmount > 0) || s.rewardAmount > 0);
    if (filter === 'free') return list.filter((s) => s.rewardAmount === 0);
    if (filter === 'pending') return list.filter((s) => s.status === 'pending');
    if (filter === 'claimed') return list.filter((s) => s.status === 'completed' && s.paid);
    return list;
  },
);
export const selectTotals = createSelector(selectAllShares, (list) => ({
  totalShares: list.length,
  totalEarned: list.reduce((sum, s) => sum + Number(s.rewardAmount || 0), 0),
  pendingCount: list.filter((s) => s.status === 'pending').length,
}));
