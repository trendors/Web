import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  selectAuthError,
  selectCurrentUser,
  selectIsLoading,
} from '../../../store/auth/sharedState/auth.selector';
import { take } from 'rxjs';
import { PasswordChangeActions } from '../../../store/auth/changePassword/change-password.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectAuthError);
  currentUser$ = this.store.select(selectCurrentUser);

  hideOld = true;
  hideNew = true;

  form = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
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
