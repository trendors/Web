import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/users/auth.service';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, filter, map, mergeMap, of, tap } from 'rxjs';
import { LoginActions } from './login.actions';
import { logoutUser } from '../logout/logout.action';

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
              return LoginActions.loginFailure({ error: response.message });
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

  loginSuccessPersist$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(LoginActions.loginSuccess),
        tap(({ response }) => {
          console.log(response);
          if (response.data?.token) {
            localStorage.setItem('token', response.data?.token);
          }
          if (response.data?.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        })
      ),
    { dispatch: false }
  );

  loginSuccessNavigate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(LoginActions.loginSuccess),
        tap(() => {
          this.router.navigate(['/home']);
        })
      ),
    { dispatch: false }
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logoutUser),
        tap(() => {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

  hydrateAuth$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT),
        map(() => localStorage.getItem('token')),
        filter((token): token is string => token !== null),
        map((token) =>
          LoginActions.loginSuccess({
            response: {
              data: { token, user: null },
              error: false,
              message: 'Hydrated from localStorage',
            },
          })
        )
      ),
    { dispatch: true }
  );
}
