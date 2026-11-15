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
import { AddProfile } from './add-profile';
import { Niches } from '../niches/niches';
import { ActiveProfileService } from '../../../core/services/activeprofile.service';
import { ActivatedRoute } from '@angular/router';
import { UpdateUserDto, User } from '../../../core/api';
import { WalletService as WalletApiService } from '../../../core/api';
import { userFirstName, userLastName } from '../../../core/utils/user-display';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AsyncPipe, DecimalPipe, TopupModalComponent, SocialVerify, Niches, AddProfile],
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
  /** The bank account payouts go to, once one is saved. */
  savedBank = signal<{ bankName: string; accountNumber: string; accountName: string } | null>(null);
  /** While set, the form is shown (to add or change the account) instead of the saved details. */
  editingBank = signal(false);
  /** The saved account that is already shown, so a later profile update does not fetch it again. */
  private loadedRecipient: string | null = null;
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
  private readonly activeProfile = inject(ActiveProfileService).activeProfile;
  private readonly route = inject(ActivatedRoute);
  activeTab: 'wallet' | 'profile' | 'security' | 'socials' | 'niches' = 'wallet';
  private readonly allTabs = [
    { id: 'wallet', label: 'Wallet' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'socials', label: 'Socials' },
    { id: 'niches', label: 'Niches' },
  ] as const;
  /** Niches are what brands match creators on, so only a creator's profile has that tab. */
  get isCreator() { return this.activeProfile() === 'creative'; }
  get tabs() { return this.allTabs.filter((t) => t.id !== 'niches' || this.activeProfile() === 'creative'); }


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
    // Deep links such as /home/profile?tab=niches open that tab.
    const wanted = this.route.snapshot.queryParamMap.get('tab');
    if (wanted && this.tabs.some((t) => t.id === wanted)) this.activeTab = wanted as typeof this.activeTab;
    // Track every user emission (the full profile arrives after login/hydrate),
    // but only overwrite the form while the user hasn't started editing it.
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (user) {
        this.user = user;
        // The full profile can arrive after the first update, so look for a saved account on every one.
        if (user.paystackRecipientCode && user.paystackRecipientCode !== this.loadedRecipient) {
          this.loadSavedBank(user.paystackRecipientCode);
        }
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
      }
    });

  }

  /** Fetch the saved account, show it, and ready the form in case the user wants to change it. */
  private loadSavedBank(recipient: string): void {
    this.loadedRecipient = recipient;
    this.loadingBank.set(true);
    this.walletService
      .getAccountDetails(recipient)
      .pipe(
        finalize(() => this.loadingBank.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.savedBank.set({ bankName: res.bankName, accountNumber: res.accountNumber, accountName: res.accountName });
            this.bankSearchCtrl.setValue(res.bankName, { emitEvent: false });
            this.bankForm.patchValue({ accountNumber: res.accountNumber, accountName: res.accountName });
            this.selectedBankCode = res.bankCode;
          } else {
            this.loadedRecipient = null; // try again on the next update
          }
        },
        error: (err) => {
          this.loadedRecipient = null;
          console.error('Failed to load saved recipient details:', err);
        },
      });
  }

  /** Only the last four digits of an account number are shown. */
  maskAccount(number: string | null | undefined): string {
    const n = String(number ?? '');
    return n.length > 4 ? '•'.repeat(n.length - 4) + n.slice(-4) : n;
  }

  cancelBankEdit(): void {
    const saved = this.savedBank();
    if (saved) this.bankForm.patchValue({ accountNumber: saved.accountNumber, accountName: saved.accountName });
    this.editingBank.set(false);
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
            // Show what was just saved, without another round trip.
            this.savedBank.set({
              bankName: this.bankSearchCtrl.value ?? '',
              accountNumber: String(this.bankForm.value.accountNumber ?? ''),
              accountName: String(this.bankForm.value.accountName ?? ''),
            });
            this.editingBank.set(false);
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
