import { Component, inject } from '@angular/core';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { selectFilteredShares, selectTotals } from '../../store/shares/shares.selector';
import { SharesActions } from '../../store/shares/shares.action';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule, AsyncPipe],
  templateUrl: './user-info-card.html',
  styleUrls: ['./user-info-card.scss'],
})
export class UserInfoCard {
  private store = inject(Store);
  private router = inject(Router);
  user$ = this.store.select(selectCurrentUser);

 
  shares$!: Observable<Share[]>;
  totals$!: Observable<{ totalShares: number; totalEarned: number; pendingCount: number }>;

  onlyPaid: boolean = false;
  selectedCats: Set<string> = new Set();

   ngOnInit() {
      this.shares$ = this.store.select(selectFilteredShares);
    this.totals$ = this.store.select(selectTotals);
      this.user$ = this.store.select(selectCurrentUser);
        this.loadShares();
    }

   async loadShares() {
      const user = await firstValueFrom(this.user$);
      if (!user) {
        return;
      }
      this.store.dispatch(SharesActions.loadShares({ userId: user.id }));
    }
  routeTo(path: string) {
    this.router.navigate([path]);
  }
}
