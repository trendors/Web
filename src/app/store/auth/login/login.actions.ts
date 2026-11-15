import { createAction, createActionGroup, props } from '@ngrx/store';
import { LoginResponse, User } from '../../../core/models/users/user.model';

export const LoginActions = createActionGroup({
  source: 'Auth Login Flow',
  events: {
    'Login Request': props<{ email: string; password: string }>(),

    'Login Success': props<{ response: LoginResponse }>(),

    /** `code` tells the screen what kind of failure it was, e.g. EMAIL_NOT_VERIFIED, so it can offer the right next step. */
    'Login Failure': props<{ error: string; code?: string }>(),

        'Hydrate Success': props<{ response: LoginResponse }>(),

  },
});

export const updateCurrentUser = createAction(
  '[Auth] Update Current User',
  props<{ user: User }>(),
);

