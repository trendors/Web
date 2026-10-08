import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, Observable, of, shareReplay, startWith, switchMap, take } from 'rxjs';
// import { User, UpdateUserDto } from '../../../core/models/users/user.model';
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
import { ToastService } from '../../../components/toast/toast.service';
import { SocialVerify } from "../social-verify/social-verify";
import { UpdateUserDto, User } from '../../../core/api';
import { WalletService as WalletApiService } from '../../../core/api';
import { userFirstName, userLastName } from '../../../core/utils/user-display';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AsyncPipe, DecimalPipe, TopupModalComponent, SocialVerify],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private walletService = inject(WalletService);
  private walletApi = inject(WalletApiService);
  private toast = inject(ToastService);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);

  user$ = this.store.select(selectCurrentUser);
  loadingBank = signal(false);
  isLoading$ = this.store.select(selectUserIsLoading);
  authIsLoading$ = this.store.select(selectIsLoading);
  authError$ = this.store.select(selectAuthError);
  loading: boolean = false;
  userError$ = this.store.select(selectUserError);
  bankSearchCtrl = new FormControl('');
  showTopup = false;
  bankCodeCtrl = new FormControl('', Validators.required);
  updatingAccount = signal(false);
  showDropdown = false;
  activeTab: 'wallet' | 'profile' | 'security' | 'socials' = 'wallet';
  readonly tabs = [
    { id: 'wallet', label: 'Wallet' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'socials', label: 'Socials' },
  ] as const;


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
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );


  ngOnInit(): void {
    // Track every user emission (the full profile arrives after login/hydrate),
    // but only overwrite the form while the user hasn't started editing it.
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (user) {
        const firstLoad = this.user == null;
        this.user = user;
        if (this.profileForm.dirty) return;
        this.profileForm.patchValue({
          // Brand-only accounts have no creative profile: fall back to the
          // brand contact name so first/last name still show.
          first_name: userFirstName(user),
          last_name: userLastName(user),
          email: user.email,
          phone_number: user.phone_number,
          user_name: user.user_name,
          trendors_id: user.trendors_id,
          twitter_handle: user.twitter_handle,
          instagram_handle: user.instagram_handle,
          facebook_username: user.facebook_username,
        });

        if (firstLoad && user.paystackRecipientCode) {
          // Load any saved account into the form; new users get an empty form.
          this.loadingBank.set(true);
          this.walletService
            .getAccountDetails(user.paystackRecipientCode)
            .pipe(
              finalize(() => this.loadingBank.set(false)),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
              next: (res) => {
                if (res && res.success) {
                  this.bankSearchCtrl.setValue(res.bankName, { emitEvent: false });
                  this.bankForm.patchValue({
                    accountNumber: res.accountNumber,
                    accountName: res.accountName,
                  });
                  this.selectedBankCode = res.bankCode;
                }
              },
              error: (err) => console.error('Failed to load saved recipient details:', err),
            });
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

  wallet$ = this.buildWallet$();

  private buildWallet$(): Observable<{ balance: number }> {
    return this.user$.pipe(
      take(1),
      switchMap((user) =>
        user?.trendors_id
          ? this.walletApi.walletControllerGetUserWallet(String(user.trendors_id)).pipe(
              map((res: any) => res?.data ?? { balance: 0 }),
              catchError(() => of({ balance: 0 })),
              shareReplay(1),
            )
          : of({ balance: 0 }),
      ),
    );
  }
  user: User | null = null;



 


  copyTrendorsId(): void {
    const id = this.user?.trendors_id;
    if (!id) return;
    navigator.clipboard
      ?.writeText(String(id))
      .then(() => this.toast.show('Trendors ID copied', 'success'))
      .catch(() => this.toast.show('Could not copy. Long-press the ID to copy it.', 'error'));
  }

  onTopupSuccess(data:any): void {
    // The modal already credited the wallet; reload so the new balance shows.
    this.wallet$ = this.buildWallet$();
  }

  onSave() {
    if (!this.user?.id) return;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const updateData: UpdateUserDto = {
      first_name: this.profileForm.value.first_name?.trim() || undefined,
      last_name: this.profileForm.value.last_name?.trim() || undefined,
      phone_number: this.profileForm.value.phone_number ?? undefined,
      twitter_handle: this.profileForm.value.twitter_handle ?? undefined,
      instagram_handle: this.profileForm.value.instagram_handle ?? undefined,
      facebook_username: this.profileForm.value.facebook_username ?? undefined,
    };
    this.store.dispatch(UserAction.updateUser({ userId: this.user.id as number, updateData }));
    this.profileForm.markAsPristine();
  }

  onDelete() {
    if (!this.user?.id) return;
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      this.store.dispatch(UserAction.deleteUser({ userId: this.user.id as number }));
    }
  }

  onChangePassword() {
    if (!this.user?.id || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    // Clear the fields only once the server accepts the change, so a wrong
    // old password doesn't wipe what the user typed.
    this.actions$
      .pipe(
        ofType(PasswordChangeActions.changePasswordSuccess, PasswordChangeActions.changePasswordFailure),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.type === PasswordChangeActions.changePasswordSuccess.type) {
          this.passwordForm.reset();
        } else {
          this.toast.show((result as { error: string }).error || 'Could not change password', 'error');
        }
      });

    this.store.dispatch(
      PasswordChangeActions.changePasswordRequest({
        userId: this.user.id as number,
        oldPassword: this.passwordForm.value.oldPassword!,
        newPassword: this.passwordForm.value.newPassword!,
      }),
    );
  }

  onSaveBankAccount(): void {
    if (this.updatingAccount()) return;
    if (this.bankForm.invalid || !this.selectedBankCode) {
      this.bankForm.markAllAsTouched();
      this.toast.show('Choose your bank and enter a valid 10-digit account number.', 'error');
      return;
    }
    if (!this.user?.trendors_id) {
      this.toast.show('Please log in again to update your bank account.', 'error');
      return;
    }
    this.updatingAccount.set(true);
    const payload = {
      trendors_id: this.user.trendors_id,
      accountNumber: this.bankForm.value.accountNumber,
      bankCode: this.selectedBankCode,
      accountName: this.bankForm.value.accountName,
    };
    this.walletService
      .addBankAccount(payload)
      .pipe(finalize(() => this.updatingAccount.set(false)))
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.toast.show('Bank account updated.', 'success');
          } else {
            console.error('Bank account update rejected:', res?.error);
            this.toast.show('Could not update your bank account.', 'error');
          }
        },
        error: (err) => {
          console.error('Bank account update failed:', err);
          this.toast.show('Could not update your bank account.', 'error');
        },
      });
  }
}
