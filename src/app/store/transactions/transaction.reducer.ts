import { createReducer, on } from '@ngrx/store';
import { Transaction } from '../../core/models/transactions/transaction.model';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { TransactionsActions } from './transaction.action';

export interface TransactionState extends EntityState<Transaction> {
  loading: boolean;
  error: string | null;
  totalCount: number;
}

export const transactionFeatureKey = 'transactions';

export const adapter: EntityAdapter<Transaction> = createEntityAdapter<Transaction>({
  selectId: (transaction) => transaction.id!, // ensure ID is used
  sortComparer: false, // or sort by date if you want
});

export const initialState: TransactionState = adapter.getInitialState({
  loading: false,
  error: null,
  totalCount: 0,
});

export const transactionReducer = createReducer(
  initialState,

  on(TransactionsActions.loadTransactions, (state) => ({ ...state, loading: true, error: null })),
  on(TransactionsActions.loadTransactionsSuccess, (state, { response }) =>
    adapter.setAll(response.list, { ...state, loading: false, totalCount: response.count }),
  ),
  on(TransactionsActions.loadTransactionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
