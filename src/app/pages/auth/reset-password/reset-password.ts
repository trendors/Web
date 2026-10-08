import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { PasswordRecoveryActions } from '../../../store/auth/passwordRecovery/password-recovery.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterModule, AsyncPipe],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);

  token: string | null = null;
  hidePassword = true;

  resetPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || null;
    });
  }

  onSubmit() {
    if (!this.token) return;
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }
    this.store.dispatch(
      PasswordRecoveryActions.resetPasswordRequest({
        token: this.token,
        newPassword: this.resetPasswordForm.value.newPassword!,
      })
    );
  }
}
