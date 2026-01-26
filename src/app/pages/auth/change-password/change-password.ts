import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import {
  selectAuthError,
  selectCurrentUser,
  selectIsLoading,
} from '../../../store/auth/shared state/auth.selector';
import { take } from 'rxjs';
import { PasswordChangeActions } from '../../../store/auth/changePassword/change-password.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-change-password',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    AsyncPipe,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  currentUser$ = this.store.select(selectCurrentUser);

  hideOld = true;
  hideNew = false;

  form = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.form.valid) {
      this.currentUser$.pipe(take(1)).subscribe((user) => {
        if (user && user.id) {
          this.store.dispatch(
            PasswordChangeActions.changePasswordRequest({
              userId: user.id,
              oldPassword: this.form.value.oldPassword!,
              newPassword: this.form.value.newPassword!,
            }),
          );
        } else {
          console.error('User ID missing');
        }
      });
    }
  }
}
