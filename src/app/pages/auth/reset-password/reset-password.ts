import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAuthError, selectIsLoading } from '../../../store/auth/sharedState/auth.selector';
import { PasswordRecoveryActions } from '../../../store/auth/passwordRecovery/password-recovery.actions';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    RouterModule,
    MatIcon,
    AsyncPipe
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private route = inject(ActivatedRoute);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);

  token: string | null = null;

  resetPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || null;
    });
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      this.store.dispatch(
        PasswordRecoveryActions.resetPasswordRequest({
          token: this.token,
          newPassword: this.resetPasswordForm.value.newPassword!,
        })
      );
    } else if (!this.token) {
      alert('Invalid or missing token.');
    }
  }
}
