import { createActionGroup, props } from '@ngrx/store';
import { RegisterResponse, RegisterDto } from '../../../core/models/users/user.model';

export const RegisterActions = createActionGroup({
  source: 'Auth Register Flow',
  events: {
    'Register Request': props<{ userData: RegisterDto }>(),
    'Register Success': props<{ response: RegisterResponse }>(),
    'Register Failure': props<{ error: string }>(),
  }
});
