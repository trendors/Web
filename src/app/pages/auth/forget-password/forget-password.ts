import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/shared state/auth.selector';
import { PasswordRecoveryActions } from '../../../store/auth/passwordRecovery/password-recovery.actions';
import { MatIcon } from "@angular/material/icon";
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-forget-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatIcon
],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss',
})
export class ForgetPassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private action$ = inject(Actions)

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);

  emailSent = false;

  constructor() {
    this.action$.pipe(
      ofType(PasswordRecoveryActions.forgotPasswordSuccess),
      takeUntilDestroyed() 
    ).subscribe((action) => {
      this.emailSent = true;

      const responseData = action.response.data?.resetToken;
      if (responseData) {
        console.log('Password reset token:', responseData);
      }
    })
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
