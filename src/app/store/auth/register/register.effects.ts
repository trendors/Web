import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AuthService } from '../../../core/services/users/auth.service';
import { Router } from '@angular/router';
import { catchError, map, mergeMap, of, tap } from 'rxjs';
import { RegisterActions } from './register.action';

@Injectable()
export class RegisterEffects {
  private action$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerRequest$ = createEffect(() =>
    this.action$.pipe(
      ofType(RegisterActions.registerRequest),
      mergeMap(({ userData }) =>
        this.authService.register(userData).pipe(
          map((response) => {
            if (response.error) {
              return RegisterActions.registerFailure({ error: response.message });
            }
            return RegisterActions.registerSuccess({ response });
          }),
          catchError((error) =>
            of(
              RegisterActions.registerFailure({ error: error.error?.message || 'Register failed' })
            )
          )
        )
      )
    )
  );

  registerSuccess$ = createEffect(() =>
      this.action$.pipe(
        ofType(RegisterActions.registerSuccess),
        tap(() => {
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );
}
