import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { catchError, map, Observable, of, shareReplay, switchMap, take } from 'rxjs';
import { User, UpdateUserDto } from '../../../core/models/users/user.model';
import { UserService } from '../../../core/services/users/user.service';
import { selectCurrentUser, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { UserAction } from '../../../store/user/user.action';
import { selectUserError } from '../../../store/user/user.selector';
import { SocialVerify } from '../social-verify/social-verify';
import { TopupModalComponent } from '../../../components/topup-modal/topup-modal';
import { WalletService } from '../../../core/services/wallet/wallet.service';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe, SocialVerify, TopupModalComponent,
    CurrencyPipe
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  constructor(private walletService: WalletService) { }
  ngOnInit(): void {
    this.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
      this.user = user;
      }
    });
  }
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private userService = inject(UserService);


  user$ = this.store.select(selectCurrentUser);
  isLoading$ = this.store.select(selectIsLoading);
  userError$ = this.store.select(selectUserError);
  wallet$ = this.user$.pipe(
    take(1),
    switchMap(user =>
      user
        ? this.walletService.getUserWallet(user.trendors_id).pipe(
          map((res: any) => res.data ?? { balance: 0 }),
          catchError(() => of({ balance: 0 })),
          shareReplay(1)
        )
        : of({ balance: 0 })
    )
  );
  user: User | null = null;


  profileForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone_number: [''],
    twitter_handle: [''],
    instagram_handle: [''],
    facebook_username: [''],
  });

  showTopup = false;

  onTopupSuccess(amount: number): void {
    // this.walletBalance += amount; 
    // your store dispatch here e.g:
    // this.store.dispatch(WalletActions.topupSuccess({ amount }))
  }

  // getUserWallet(trendors_id: string) {
  //   this.wallet$ = this.walletService.getUserWallet(trendors_id ?? '').pipe(
  //     map((res: any) => res.data ?? { balance: 0 }),
  //     catchError(() => of({ balance: 0 }))
  //   );
  // }

  ççç() {
    this.user$.pipe(take(1)).subscribe((user) => {
      // this.currentUser = user;
      if (user) {
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone_number: user.phone_number,
          twitter_handle: user.twitter_handle,
          instagram_handle: user.instagram_handle,
          facebook_username: user.facebook_username,
        });
      }
    });
  }

  onSave() {
    if (this.profileForm.valid && this.user) {
      const updateData: UpdateUserDto = {
        first_name: this.profileForm.value.first_name ?? undefined,
        last_name: this.profileForm.value.last_name ?? undefined,
        phone_number: this.profileForm.value.phone_number ?? undefined,
        twitter_handle: this.profileForm.value.twitter_handle ?? undefined,
        instagram_handle: this.profileForm.value.instagram_handle ?? undefined,
        facebook_username: this.profileForm.value.facebook_username ?? undefined,
      };

      this.store.dispatch(UserAction.updateUser({ userId: this.user!.id, updateData }));
    }
  }

  onDelete() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      this.store.dispatch(UserAction.deleteUser({ userId: this.user!.id }));
    }
  }
}
