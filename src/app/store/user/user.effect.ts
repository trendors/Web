import { inject, Injectable } from '@angular/core';
import { UserService } from '../../core/services/users/user.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { mergeMap, map, catchError, of, tap } from 'rxjs';
import { UserAction } from './user.action';
import { logoutUser } from '../auth/logout/logout.action';
import { updateCurrentUser } from '../auth/login/login.actions';
import { AuthService } from '../../core/services/auth/auth.service';
import { User } from '../../core/models/users/user.model';
import { ToastService } from '../../components/toast/toast.service';

@Injectable()
export class UserEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  

 updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.updateUser), 
      tap(({ userId, updateData }) => console.log('Update User action caught in effect:', { userId, updateData })), 
      mergeMap(({ userId, updateData }) =>
        this.userService.updateUser(userId, updateData).pipe(
          map((response) => {
            if (response.data) {
              this.toast.show('Successfully Updated Account', 'success');
              return UserAction.updateUserSuccess({ user: response.data });
            } else {
              this.toast.show(response.message || 'Failed to update user', 'error');
              return UserAction.updateUserFailure({
                error: response.message || 'Failed to update user',
              });
            }
          }),
          catchError((error) => {
            this.toast.show(error.message || 'Server error updating account', 'error');
            return of(UserAction.updateUserFailure({ error: error.message }));
          })
        )
      )
    )
  );

updateUserSuccess$ = createEffect(() =>
  this.actions$.pipe(
    ofType(UserAction.updateUserSuccess),
    map(({ user }) =>
      UserAction.loadCurrentUser({ userId: user.id }) // 🔥 use returned ID
    )
  )
);

loadCurrentUser$ = createEffect(() =>
  this.actions$.pipe(
    ofType(UserAction.loadCurrentUser),
    mergeMap(({ userId }) =>
      this.authService.getUserById(userId).pipe(
        map((user: User | undefined) => updateCurrentUser({ user: user as User })),
        catchError((error) =>
          of(UserAction.loadCurrentUserFailure({ error: error.message }))
        )
      )
    )
  )
);

  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.deleteUser),
      mergeMap(({ userId }) =>
        this.userService.deleteUser(userId).pipe(
          map((response) =>
            response.data
              ? UserAction.deleteUserSuccess({
                message: response.message || 'User deleted successfully',
              })
              : UserAction.deleteUserFailure({
                error: response.message || 'Failed to delete user',
              })
          ),
          catchError((error) =>
            of(UserAction.deleteUserFailure({ error: error.message }))
          )
        )
      )
    )
  );

  deleteUserSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.deleteUserSuccess),
      map(() => logoutUser())
    )
  );
}