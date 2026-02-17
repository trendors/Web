import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Share } from '../../../core/models/shares/shares.model';
import {
  selectFilteredShares,
  selectSharesFilter,
  selectSharesLoading,
  selectTotals,
} from '../../../store/shares/shares.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { SharesActions } from '../../../store/shares/shares.action';
import { AsyncPipe, DecimalPipe, NgClass, TitleCasePipe } from '@angular/common';
import { TimeAgoPipe } from "../../../time-ago-pipe";

@Component({
  selector: 'app-main',
  imports: [
    AsyncPipe,
    DecimalPipe, 
    TitleCasePipe, 
    TimeAgoPipe,
    NgClass
  ],
  templateUrl: './shares.html',
  styleUrl: './shares.scss',
})
export class SharesDashboard {
  private store = inject(Store);

  shares$!: Observable<Share[]>;
  totals$ = this.store.select(selectTotals);
  loading$ = this.store.select(selectSharesLoading);
  filter$ = this.store.select(selectSharesFilter);

  ngOnInit() {
    this.shares$ = this.store.select(selectFilteredShares);

    this.store.select(selectCurrentUser).subscribe((user) => {
      if (user?.id) {
        this.store.dispatch(SharesActions.loadShares({ userId: user.id }));
      }
    });
  }

  setFilter(filter: 'all' | 'paid' | 'free' | 'pending' | 'claimed') {
    this.store.dispatch(SharesActions.setFilter({ filter }));
  }
}
