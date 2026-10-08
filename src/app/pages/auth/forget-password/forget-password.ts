import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { PasswordRecoveryActions } from '../../../store/auth/passwordRecovery/password-recovery.actions';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-forget-password',
  imports: [ReactiveFormsModule, RouterModule, AsyncPipe],
  templateUrl: './forget-password.html',
})
export class ForgetPassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private action$ = inject(Actions);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);

  emailSent = signal(false);

  constructor() {
    this.action$
      .pipe(ofType(PasswordRecoveryActions.forgotPasswordSuccess), takeUntilDestroyed())
      .subscribe(() => {
        // The reset link only ever arrives by email.
        this.emailSent.set(true);
      });
  }

  fpForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.fpForm.valid) {
      this.store.dispatch(
        PasswordRecoveryActions.forgotPasswordRequest({ email: this.fpForm.value.email! })
      );
    }
  }
}
