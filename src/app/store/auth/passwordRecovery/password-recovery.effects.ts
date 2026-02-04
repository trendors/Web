import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from '../../../core/services/auth/auth.service';
import { PasswordRecoveryActions } from './password-recovery.actions';
import { catchError, map, mergeMap, of } from 'rxjs';

@Injectable()
export class PasswordRecoveryEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  forgetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PasswordRecoveryActions.forgotPasswordRequest),
      mergeMap(({ email }) =>
        this.authService.forgotPassword({ email }).pipe(
          map((response) => {
            if (response.error) {
              return PasswordRecoveryActions.forgotPasswordFailure({ error: response.message });
            }
            return PasswordRecoveryActions.forgotPasswordSuccess({ response });
          }),
          catchError((error) =>
            of(
              PasswordRecoveryActions.forgotPasswordFailure({
                error: error.error?.message || 'Forgot password request failed',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  resetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PasswordRecoveryActions.resetPasswordRequest),
      mergeMap(({ token, newPassword }) =>
        this.authService.resetPassword({ token, newPassword }).pipe(
          map((response) => {
            if (response.error) {
              return PasswordRecoveryActions.resetPasswordFailure({ error: response.message });
            }
            return PasswordRecoveryActions.resetPasswordSuccess({ response });
          }),
          catchError((error) =>
            of(
              PasswordRecoveryActions.resetPasswordFailure({
                error: error.error?.message || 'Reset password request failed',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  resetSucessNavigate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(PasswordRecoveryActions.resetPasswordSuccess),
        map(() => {
          this.router.navigate(['/login']);
        }),
      ),
    { dispatch: false },
  );
}
