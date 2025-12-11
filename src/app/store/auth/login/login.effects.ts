import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/users/auth.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import * as LoginActions from '../login/login.actions';
import { catchError, map, mergeMap, of, tap } from 'rxjs';

@Injectable()
export class LoginEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoginActions.loginUser),
      mergeMap(({ credentials }) =>
        this.authService.login(credentials.email, credentials.password).pipe(
          map((loginResponse) => {
            if (loginResponse.error) {
              return LoginActions.loginUserFailure({ error: loginResponse.messasge });
            }
            return LoginActions.loginUserSuccess({ loginResponse });
          }),
          catchError((error) =>
            of(LoginActions.loginUserFailure({ error: error.error?.message || 'Login failed' }))
          )
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(LoginActions.loginUserSuccess),
        tap(({ loginResponse }) => {
          localStorage.setItem('token', loginResponse.token);
          this.router.navigate(['/home']);
        })
      ),
    { dispatch: false }
  );
}
