import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PasswordChangeActions } from './change-password.actions';
import { catchError, map, mergeMap, of } from 'rxjs';
import { ToastService } from '../../../components/toast/toast.service';

@Injectable()
export class ChangePasswordEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  changePassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PasswordChangeActions.changePasswordRequest),
      mergeMap(({ userId, oldPassword, newPassword }) =>
        this.authService.changePassword(userId, { oldPassword, newPassword }).pipe(
          map((response) => {
            if (response.error) {
              return PasswordChangeActions.changePasswordFailure({ error: response.message });
            }
            this.toast.show("Password Updated", 'success')
            return PasswordChangeActions.changePasswordSuccess({ response });
            
          }),
          catchError((error) =>
            of(
              PasswordChangeActions.changePasswordFailure({
                error: error.error?.message || 'Change password request failed',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
