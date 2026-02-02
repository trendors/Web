import { Component, inject } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../../../store/auth/shared state/auth.selector';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    MatIconModule,
    RouterModule,
    MatDividerModule,
    MatSidenavModule,
    MatListModule,
    AsyncPipe
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
})
export class DashboardLayout {
  private store = inject(Store);
  user$ = this.store.select(selectCurrentUser);
}
