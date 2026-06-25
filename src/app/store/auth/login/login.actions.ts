import { createAction, createActionGroup, props } from '@ngrx/store';
import { LoginResponse, User } from '../../../core/models/users/user.model';

export const LoginActions = createActionGroup({
  source: 'Auth Login Flow',
  events: {
    'Login Request': props<{ email: string; password: string }>(),

    'Login Success': props<{ response: LoginResponse }>(),

    'Login Failure': props<{ error: string }>(),

        'Hydrate Success': props<{ response: LoginResponse }>(),

  },
});

export const updateCurrentUser = createAction(
  '[Auth] Update Current User',
  props<{ user: User }>(),
);

