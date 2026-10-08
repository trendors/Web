
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { combineLatest, map, debounceTime, startWith, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TransactionType } from '../../../core/models/transactions/transaction.model';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { TransactionsActions } from '../../../store/transactions/transaction.action';
import { selectAllTransactions, selectTransactionsLoading, selectTransactionsError, selectTransactionsCount } from '../../../store/transactions/transaction.selector';


export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction.html',
  styleUrl: './transaction.scss',
})
export class Transaction implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  TransactionType = TransactionType;
  readonly filters = [
    { value: TransactionType.ALL, label: 'All' },
    { value: TransactionType.CREDIT, label: 'Money in' },
    { value: TransactionType.DEBIT, label: 'Money out' },
  ];
  currentUserId: string | null = null;

  filterForm = this.fb.nonNullable.group({
    transaction_type: TransactionType.ALL,
    limit: 10,
    sort: 'DESC' as 'DESC' | 'ASC',
  });

  /** 0-based page index, matching the API's `page`. */
  page = signal(0);

  transactions$ = this.store.select(selectAllTransactions);
  loading$ = this.store.select(selectTransactionsLoading);
  error$ = this.store.select(selectTransactionsError);
  totalCount$ = this.store.select(selectTransactionsCount);
  currentUser$ = this.store.select(selectCurrentUser);

  totalPages$ = combineLatest([
    this.totalCount$,
    this.filterForm.controls.limit.valueChanges.pipe(startWith(this.filterForm.controls.limit.value)),
  ]).pipe(map(([total, limit]) => Math.max(1, Math.ceil((total || 0) / (limit || 10)))));

  private totalPages = 1;

  ngOnInit(): void {
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user?.trendors_id) {
        this.currentUserId = user.trendors_id;
        this.loadTransactions();
      }
    });

    this.totalPages$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pages) => (this.totalPages = pages));

    // Any filter change starts again from the first page.
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.loadTransactions();
      });
  }

  loadTransactions(): void {
    if (!this.currentUserId) return;
    const query = {
      ...this.filterForm.getRawValue(),
      page: this.page(),
      trendor_id: this.currentUserId,
    };
    this.store.dispatch(TransactionsActions.loadTransactions({ query }));
  }

  setType(type: TransactionType): void {
    this.filterForm.controls.transaction_type.setValue(type);
  }

  previousPage(): void {
    if (this.page() <= 0) return;
    this.page.update((p) => p - 1);
    this.loadTransactions();
  }

  nextPage(): void {
    if (this.page() + 1 >= this.totalPages) return;
    this.page.update((p) => p + 1);
    this.loadTransactions();
  }
}
