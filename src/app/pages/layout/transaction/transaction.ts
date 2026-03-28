import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  selectAllTransactions,
  selectTransactionsCount,
  selectTransactionsError,
  selectTransactionsLoading,
} from '../../../store/transactions/transaction.selector';
import { TransactionType } from '../../../core/models/transactions/transaction.model';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TransactionsActions } from '../../../store/transactions/transaction.action';

@Component({
  standalone: true,
  selector: 'app-transaction',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './transaction.html',
  styleUrl: './transaction.scss',
})
export class Transaction implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['date', 'description', 'type', 'amount', 'status'];
  transactions$ = this.store.select(selectAllTransactions);
  loading$ = this.store.select(selectTransactionsLoading);
  error$ = this.store.select(selectTransactionsError);
  totalCount$ = this.store.select(selectTransactionsCount);
  currentUser$ = this.store.select(selectCurrentUser);

  currentUserId: string | null = null;

  TransactionType = TransactionType;

  filterForm = this.fb.nonNullable.group({
    searchQuery: [''],
    transaction_type: TransactionType.ALL,
    limit: 10,
    page: 1,
    sort: 'DESC' as 'DESC' | 'ASC',
  });

  ngOnInit() {
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user?.trendors_id) {
        this.currentUserId = user.trendors_id;
        this.loadTransactions();
      }
    });

    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.loadTransactions());
  }

  loadTransactions() {
    if (!this.currentUserId) return;

    const query = {
      ...this.filterForm.value,
      trendors_id: this.currentUserId,
    };

    this.store.dispatch(TransactionsActions.loadTransactions({ query }));
  }

  onPageChange(event: PageEvent) {
    this.filterForm.patchValue({
      page: event.pageIndex + 1,
      limit: event.pageSize,
    });
  }
}
