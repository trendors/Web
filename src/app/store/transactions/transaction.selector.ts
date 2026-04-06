import { createFeatureSelector, createSelector } from '@ngrx/store';
import { adapter, transactionFeatureKey, TransactionState } from './transaction.reducer';

export const selectTransactionsState =
  createFeatureSelector<TransactionState>(transactionFeatureKey);

// Entity selectors
const { selectAll, selectEntities, selectIds, selectTotal } = adapter.getSelectors();

// All transactions as array
export const selectAllTransactions = createSelector(selectTransactionsState, selectAll);

export const selectTransactionsLoading = createSelector(
  selectTransactionsState,
  (state) => state.loading,
);

export const selectTransactionsError = createSelector(
  selectTransactionsState,
  (state) => state.error,
);

export const selectTransactionsCount = createSelector(
  selectTransactionsState,
  (state) => state.totalCount,
);
