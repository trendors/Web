import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Store } from '@ngrx/store';
import { selectCurrentUser, selectIsLoggedIn } from '../../store/auth/shared state/auth.selector';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { selectUnreadCount } from '../../store/notification/notification.selector';

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    AsyncPipe,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private store = inject(Store);

  isLoggedIn$ = this.store.select(selectIsLoggedIn);
  currentUser$ = this.store.select(selectCurrentUser);
  unreadCount$ = this.store.select(selectUnreadCount);

  onLogout() {
    this.store.dispatch(logoutUser());
  }
}
