import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { Router } from '@angular/router';
import { catchError, filter, map, mergeMap, of, tap } from 'rxjs';
import { LoginActions } from './login.actions';
import { logoutUser } from '../logout/logout.action';
import { isPlatformBrowser } from '@angular/common';
import { NotificationActions } from '../../notification/notification.action';
import { UserAction } from '../../user/user.action';
import { Store } from '@ngrx/store';
import { User } from '../../../core/models/users/user.model';
import { isTokenExpired } from '../../../core/utils/jwt';

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
            of(LoginActions.loginFailure({ error: error?.message || 'Login failed' })),
          ),
        ),
      ),
    ),
  );

  loginSuccessPersist$ = createEffect(
  () =>
    this.actions$.pipe(
      ofType(
        LoginActions.loginSuccess,
        LoginActions.hydrateSuccess
      ),
      tap(({ response }) => {
        if (!isPlatformBrowser(this.platformId)) return;
        if (response?.data?.token) {
          localStorage.setItem('token', response.data.token);
        }

        if (response?.data?.user) {
          localStorage.setItem(
            'user',
            JSON.stringify(response.data.user)
          );
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
          // Preserve possible returnUrl query param (set by authGuard). If present, navigate there.
          const parsed = this.router.parseUrl(this.router.url);
          const returnUrl = (parsed.queryParams && parsed.queryParams['returnUrl']) as
            | string
            | undefined;
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/home']);
          }
        }),
      ),
    { dispatch: false },
  );

  // The login payload may not include profile relations (brand/creative), which
  // the app needs to pick the right experience. Reload the full user right away.
  loginSuccessRefreshUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LoginActions.loginSuccess, LoginActions.hydrateSuccess),
      map(({ response }) => response?.data?.user?.id),
      filter((id): id is number => typeof id === 'number'),
      map((userId) => UserAction.loadCurrentUser({ userId })),
    ),
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logoutUser),
        tap(() => {
          if (!isPlatformBrowser(this.platformId)) return;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('activeProfile');
          this.router.navigate(['/login']);
        }),
      ),
    { dispatch: false },
  );


   hydrateAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT), // your own custom action, or just filter differently
      filter(() => isPlatformBrowser(this.platformId)),
      map(() => {
        const token = localStorage.getItem('token');
        const userRaw = localStorage.getItem('user');
        if (!token || !userRaw) return null;
        let user: User | null = null;
        try {
          user = JSON.parse(userRaw);
        } catch {
          user = null;
        }
        if (!user || isTokenExpired(token)) {
          // Stale or corrupt session: clear it instead of hydrating.
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        return LoginActions.hydrateSuccess({
          response: { data: { token, user, message: 'Hydrated', error: false } },
        });
      }),
      filter(Boolean),
    ),
  );

}
