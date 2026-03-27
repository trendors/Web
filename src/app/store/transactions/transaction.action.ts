import { createActionGroup, props } from '@ngrx/store';
import {
  FindTransactionsDto,
  TransactionResponse,
} from '../../core/models/transactions/transaction.model';

export const TransactionsActions = createActionGroup({
  source: 'Transactions Action Flow',
  events: {
    'Load Transactions': props<{ params: FindTransactionsDto }>(),
    'Load Transactions Success': props<{ response: TransactionResponse }>(),
    'Load Transactions Failure': props<{ error: string }>(),
  },
});
