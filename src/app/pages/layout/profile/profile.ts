import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, Observable, of, shareReplay, startWith, switchMap, take, tap } from 'rxjs';
import { User, UpdateUserDto } from '../../../core/models/users/user.model';
import {
  selectAuthError,
  selectCurrentUser,
  selectIsLoading,
} from '../../../store/auth/sharedState/auth.selector';
import { PasswordChangeActions } from '../../../store/auth/changePassword/change-password.actions';
import { UserAction } from '../../../store/user/user.action';
import { selectUserError, selectUserIsLoading } from '../../../store/user/user.selector';
import { TopupModalComponent } from '../../../components/topup-modal/topup-modal';
import { WalletService } from '../../../core/services/wallet/wallet.service';
import { LoaderComponent } from "../../../components/loader/loader";
import { Alert } from "../../../components/alert/alert";
import { ToastService } from '../../../components/toast/toast.service';
import { SocialVerify } from "../social-verify/social-verify";

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AsyncPipe,
    TopupModalComponent,
    CurrencyPipe,
    LoaderComponent,
    Alert,
    SocialVerify
],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private walletService = inject(WalletService);
  private toast = inject(ToastService);

  user$ = this.store.select(selectCurrentUser);
  savedBankDetails$: Observable<any> | null = null;
  isLoading$ = this.store.select(selectUserIsLoading);
  authIsLoading$ = this.store.select(selectIsLoading);
  authError$ = this.store.select(selectAuthError);
  loading: boolean = false;
  userError$ = this.store.select(selectUserError);
  bankSearchCtrl = new FormControl('');
  showTopup = false;
  isSubmitting = false
  bankCodeCtrl = new FormControl('', Validators.required);
  updatingAccount: boolean = false
  showDropdown = false;
  activeTab: 'wallet' | 'profile' | 'security' | 'socials' = 'wallet';


   private passwordMatchValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    // Only flag an error if both fields have values but don't match
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  };



  profileForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone_number: [''],
    user_name: [{ value: '', disabled: true }],
    trendors_id: [{ value: '', disabled: true }],
    twitter_handle: [''],
    instagram_handle: [''],
    facebook_username: [''],
  });

  bankForm = this.fb.group({
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    accountName: ['', Validators.required]
  });

  selectedBankCode?: string

  passwordForm = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );


  ngOnInit(): void {
  
    this.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.user = user;
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone_number: user.phone_number,
          user_name: user.user_name,
          trendors_id: user.trendors_id,
          twitter_handle: user.twitter_handle,
          instagram_handle: user.instagram_handle,
          facebook_username: user.facebook_username,
        });

        if (user.paystackRecipientCode) {
          this.savedBankDetails$ = this.walletService.getAccountDetails(user.paystackRecipientCode).pipe(
            tap((res) => {
              if (res && res.success) {
                this.bankSearchCtrl.setValue(res.bankName);
                this.bankForm.patchValue({
                  accountNumber: res.accountNumber,
                  accountName: res.accountName
                });
                this.selectedBankCode = res.bankCode

              }
            }),
            catchError((err) => {
              console.error("Failed to load saved recipient details:", err);
              return of(null);
            })
          );
        }

      }
    });

  }

  banks$: Observable<any> = this.bankSearchCtrl.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(searchString =>
      this.walletService.fetchBanks(searchString ?? '').pipe(
        catchError(() => of([]))
      )
    )
  );

  onSelectBank(bank: any): void {
    this.selectedBankCode = bank.code;
    this.bankSearchCtrl.setValue(bank.name, { emitEvent: false });
    this.showDropdown = false;
  }

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



 


  onTopupSuccess(amount: number): void {
    // this.walletBalance += amount; 
    // your store dispatch here e.g:
    // this.store.dispatch(WalletActions.topupSuccess({ amount }))
  }

  getAccountDetails() {
    this.walletService.getAccountDetails(this.user?.paystackRecipientCode).pipe(
      map((res: any) => {
      }),
    )
  }

  onSave() {
    const updateData: UpdateUserDto = {
      first_name: this.profileForm.value.first_name ?? undefined,
      last_name: this.profileForm.value.last_name ?? undefined,
      phone_number: this.profileForm.value.phone_number ?? undefined,
      twitter_handle: this.profileForm.value.twitter_handle ?? undefined,
      instagram_handle: this.profileForm.value.instagram_handle ?? undefined,
      facebook_username: this.profileForm.value.facebook_username ?? undefined,
    };
    this.store.dispatch(UserAction.updateUser({ userId: this.user!.id, updateData }))
  }

  onDelete() {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      this.store.dispatch(UserAction.deleteUser({ userId: this.user!.id }));
    }
  }

  onChangePassword() {
    // if (!this.user?.id || this.passwordForm.invalid) {
    //   this.passwordForm.markAllAsTouched();
    //   return;
    // }

    console.log(this.passwordForm.value.oldPassword, )

    this.store.dispatch(
      PasswordChangeActions.changePasswordRequest({
        userId: this.user?.id as any,
        oldPassword: this.passwordForm.value.oldPassword!,
        newPassword: this.passwordForm.value.newPassword!,
      }),
    );

    this.passwordForm.reset();
  }

  onSaveBankAccount(): void {
    this.updatingAccount = true
    const payload = {
      trendors_id: this.user?.trendors_id,
      accountNumber: this.bankForm.value.accountNumber,
      bankCode: this.selectedBankCode,
      accountName: this.bankForm.value.accountName
    };
    this.walletService.addBankAccount(payload)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.updatingAccount = false
            this.toast.show('Successfully Updated Account', 'success');
          } else {
            this.updatingAccount = false
            console.error('Registration API rejected submission:', res.error);
            this.toast.show('Error in updating account', 'error');

          }
        },
        error: (err) => {
          this.updatingAccount = false
          console.error('Network dispatch failure on banking submission:', err);
          this.toast.show('Error in updating account', 'error');

        }
      });
  }
}
