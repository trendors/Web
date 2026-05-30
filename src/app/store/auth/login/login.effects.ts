import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, filter, map, mergeMap, of, tap } from 'rxjs';
import { LoginActions } from './login.actions';
import { logoutUser } from '../logout/logout.action';
import { isPlatformBrowser } from '@angular/common';
import { NotificationActions } from '../../notification/notification.action';
import { Store } from '@ngrx/store';

@Injectable()
export class LoginEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private store = inject(Store);

  loginRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoginActions.loginRequest),
      mergeMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map((response) => {
            if (response.data.error) {
              return LoginActions.loginFailure({ error: response.data.message });
            }
            return LoginActions.loginSuccess({ response });
          }),
          catchError((error) =>
            of(LoginActions.loginFailure({ error: error.error?.message || 'Login failed' })),
          ),
        ),
      ),
    ),
  );

  loginSuccessPersist$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(LoginActions.loginSuccess),
        tap(({ response }) => {
          console.log(response, "response from login success effect");
          if (response?.data?.token) {
            localStorage.setItem('token', response?.data.token);
          }
          if (response?.data?.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }),
      ),
    { dispatch: false },
  );

  loginSuccessNavigate$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(LoginActions.loginSuccess),
        tap(({ response }) => {
          if (response?.data?.user?.id) {
            this.store.dispatch(
              NotificationActions.loadNotifications({ trendorId: response.data.user.trendors_id }),
            );
          }
          this.router.navigate(['/home']);
          console.log('Login successful, navigating to /home');
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logoutUser),
        tap(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/login']);
        }),
      ),
    { dispatch: false },
  );

  hydrateAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      filter(() => isPlatformBrowser(this.platformId)),
      map(() => {
        const token = localStorage.getItem('token');
        const userRaw = localStorage.getItem('user');

        if (!token || !userRaw) {
          return null;
        }

        return LoginActions.loginSuccess({
          response: {
              data: {
                token,
                user: JSON.parse(userRaw),
                message: 'Hydrated from localStorage',
                error: false,
              },
          },
        });
      }),
      filter(Boolean),
    ),
  );
}
