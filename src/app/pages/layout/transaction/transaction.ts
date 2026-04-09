
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, debounceTime, distinctUntilChanged, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TransactionType } from '../../../core/models/transactions/transaction.model';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { TransactionsActions } from '../../../store/transactions/transaction.action';
import { selectAllTransactions, selectTransactionsLoading, selectTransactionsError, selectTransactionsCount } from '../../../store/transactions/transaction.selector';
import { UserInfoCard } from '../../../components/user-info-card/user-info-card';


export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserInfoCard],
  templateUrl: './transaction.html',
  styleUrl: './transaction.scss',
})
export class Transaction implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  TransactionType = TransactionType;
  currentUserId: string | null = null;

  // Filter form with same structure as original
  filterForm = this.fb.nonNullable.group({
    transaction_type: TransactionType.ALL,
    limit: 10,
    page: 0,
    sort: 'DESC' as 'DESC' | 'ASC',
  });

  // Observables from store
  transactions$ = this.store.select(selectAllTransactions);
  loading$ = this.store.select(selectTransactionsLoading);
  error$ = this.store.select(selectTransactionsError);
  totalCount$ = this.store.select(selectTransactionsCount);
  currentUser$ = this.store.select(selectCurrentUser);

  // Derived observables for pagination
  pageSize$: Observable<number> = this.filterForm.get('limit')!.valueChanges.pipe(
    distinctUntilChanged(),
    map(limit => limit || 10)
  );

  totalPages$ = combineLatest([this.totalCount$, this.pageSize$]).pipe(
    map(([total, pageSize]) => Math.ceil((total || 0) / pageSize))
  );

  pageInfo$ = combineLatest([
    this.filterForm.get('page')!.valueChanges,
    this.totalCount$,
    this.pageSize$
  ]).pipe(
    map(([page, total, pageSize]) => ({
      start: (page - 1) * pageSize + 1,
      end: Math.min(page * pageSize, total || 0)
    }))
  );

  ngOnInit(): void {
    // Get current user and initialize transactions
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user?.trendors_id) {
        this.currentUserId = user.trendors_id;
        this.loadTransactions();
      }
    });

    // Listen to filter changes and reload
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadTransactions());
  }

  /**
   * Load transactions with current filter values and user ID
   */
  loadTransactions(): void {
    if (!this.currentUserId) return;

    const query = {
      ...this.filterForm.value,
      trendors_id: this.currentUserId,
    };

    this.store.dispatch(TransactionsActions.loadTransactions({ query }));
  }

  /**
   * Open transaction details in dialog
   */
  openTransactionDialog(transaction: any): void {
    // this.dialog.open(TransactionDetailsDialogComponent, {
    //   data: transaction,
    //   width: '90%',
    //   maxWidth: '500px',
    //   panelClass: 'transaction-dialog',
    //   enterAnimationDuration: 300,
    //   exitAnimationDuration: 200
    // });
  }

  /**
   * Handle pagination - previous page
   */
  previousPage(): void {
    const currentPage = this.filterForm.get('page')?.value || 1;
    if (currentPage > 1) {
      this.filterForm.patchValue({ page: currentPage - 1 });
    }
  }

  /**
   * Handle pagination - next page
   */
  nextPage(): void {
    combineLatest([
      this.filterForm.get('page')!.valueChanges,
      this.totalPages$
    ])
      .pipe(take(1))
      .subscribe(([currentPage, totalPages]) => {
        if (currentPage < totalPages) {
          this.filterForm.patchValue({ page: currentPage + 1 });
        }
      });
  }

  /**
   * Handle MatPaginator page change event (optional, for Material paginator compatibility)
   */
  onPageChange(event: PageEvent): void {
    this.filterForm.patchValue({
      page: event.pageIndex + 1,
      limit: event.pageSize,
    });
  }
}