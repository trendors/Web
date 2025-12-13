import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/users/auth.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, map, mergeMap, of, tap } from 'rxjs';
import { LoginActions } from './login.actions';

@Injectable()
export class LoginEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoginActions.loginRequest),
      mergeMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map((response) => {
            if (response.error) {
              return LoginActions.loginFailure({ error: response.messasge });
            }
            return LoginActions.loginSuccess({ response });
          }),
          catchError((error) =>
            of(LoginActions.loginFailure({ error: error.error?.message || 'Login failed' }))
          )
        )
      )
    )
  );

  loginSuccess$ = createEffect(() =>
      this.actions$.pipe(
        ofType(LoginActions.loginSuccess),
        tap(({ response }) => {
          localStorage.setItem('token', response.token);
          this.router.navigate(['/home']);
        })
      ),
    { dispatch: false }
  );
}
