import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { firstValueFrom, Observable } from 'rxjs';
import { Share } from '../../core/models/shares/shares.model';
import { SharesActions } from '../../store/shares/shares.action';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { selectFilteredShares } from '../../store/shares/shares.selector';

@Component({
  selector: 'app-top-nav-filter',
  imports: [MatIconModule,
    MatCardModule,
    MatInputModule,],
  templateUrl: './top-nav-filter.html',
  styleUrl: './top-nav-filter.scss',
})
export class TopNavFilter {
  private store = inject(Store);
  categories: string[] = [];
  shares$!: Observable<Share[]>;
  user$!: Observable<any>;

  onlyPaid: boolean = false;
  selectedCats: Set<string> = new Set();

   ngOnInit() {
      this.shares$ = this.store.select(selectFilteredShares);
      this.user$ = this.store.select(selectCurrentUser);
        this.loadShares();
    }

   async loadShares() {
      let user = await firstValueFrom(this.user$);
      this.store.dispatch(SharesActions.loadShares({ userId: user.id }));
    }

  togglePaid() {
    this.onlyPaid = !this.onlyPaid;
    this.applyFilters();
  }

  toggleCategory(cat: string) {
    if (this.selectedCats.has(cat)) {
      this.selectedCats.delete(cat);
    } else {
      this.selectedCats.add(cat);
    }
    this.applyFilters();
  }

  applyFilters() {
    const filters = {
      isPaid: this.onlyPaid,
      categories: Array.from(this.selectedCats) // Convert Set back to Array for the API
    };
  }
}
