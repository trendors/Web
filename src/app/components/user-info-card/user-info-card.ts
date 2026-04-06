import { Component, inject } from '@angular/core';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-info-card',
  imports: [AsyncPipe],
  templateUrl: './user-info-card.html',
  styleUrl: './user-info-card.scss',
})
export class UserInfoCard {
  private store = inject(Store);
  private router = inject(Router);
  user$ = this.store.select(selectCurrentUser);


  routeTo(path: string) {
    this.router.navigate([path]);
  }
}
