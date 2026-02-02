import { inject, Injectable } from '@angular/core';
import { UserService } from '../../core/services/users/user.service';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { mergeMap, map, catchError, of } from 'rxjs';
import { UserAction } from './user.action';
import { logoutUser } from '../auth/logout/logout.action';
import { updateCurrentUser } from '../auth/login/login.actions';

@Injectable()
export class UserEffects {
  private actions$ = inject(Actions);
  private userService = inject(UserService);

  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.updateUser),
      mergeMap(({ userId, updateData }) =>
        this.userService.updateUser(userId, updateData).pipe(
          map((response) => {
            if (!response.data) {
              return UserAction.updateUserFailure({
                error: response.message || 'Failed to update user',
              });
            }
            return UserAction.updateUserSuccess({
              user: response.data,
            });
          }),
          catchError((error) => of(UserAction.updateUserFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  updateUserSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.updateUserSuccess),
      map(({ user }) => updateCurrentUser({ user })),
    ),
  );

  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.deleteUser),
      mergeMap(({ userId }) =>
        this.userService.deleteUser(userId).pipe(
          map((response) => {
            if (!response.data) {
              return UserAction.deleteUserFailure({
                error: response.message || 'Failed to delete user',
              });
            }
            return UserAction.deleteUserSuccess({
              message: response.message || 'User deleted successfully',
            });
          }),
          catchError((error) => of(UserAction.deleteUserFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  deleteUserSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserAction.deleteUserSuccess),
      map(() => logoutUser()),
    ),
  );
}
