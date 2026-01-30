import { createActionGroup, props } from '@ngrx/store';
import { LoginResponse } from '../../../core/models/users/user.model';

export const LoginActions = createActionGroup({
  source: 'Auth Login Flow',
  events: {
    'Login Request': props<{ email: string; password: string }>(),

    'Login Success': props<{ response: LoginResponse }>(),

    'Login Failure': props<{ error: string }>(),
  },
});
