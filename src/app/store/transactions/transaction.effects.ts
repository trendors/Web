import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TransactionService } from '../../core/services/transactions/transaction.service';
import { TransactionsActions } from './transaction.action';
import { catchError, map, mergeMap } from 'rxjs';

@Injectable()
export class TransactionsEffects {
  private actions$ = inject(Actions);
  private transactionService = inject(TransactionService);

  loadTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TransactionsActions.loadTransactions),
      mergeMap(({ params }) =>
        this.transactionService.findAll(params).pipe(
          map((response) => TransactionsActions.loadTransactionsSuccess({ response })),
          catchError((error) => [
            TransactionsActions.loadTransactionsFailure({
              error: error.message || 'Load transactions failed',
            }),
          ]),
        ),
      ),
    ),
  );
}
