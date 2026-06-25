import { Component } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { selectTotals } from '../../store/shares/shares.selector';

@Component({
  selector: 'app-your-earnings',
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './your-earnings.html',
  styleUrls: ['./your-earnings.scss'],
})
export class YourEarnings {
  totals$: Observable<{ totalShares: number; totalEarned: number; pendingCount: number }>;

  constructor(private store: Store) {
    this.totals$ = this.store.select(selectTotals);
  }

}
