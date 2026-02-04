import { createActionGroup, props } from '@ngrx/store';
import {
  ForgotPasswordResponse,
  PasswordResetResponse,
} from '../../../core/models/users/user.model';

export const PasswordRecoveryActions = createActionGroup({
  source: 'Auth Password Recovery',
  events: {
    'Forgot Password Request': props<{ email: string }>(),
    'Forgot Password Success': props<{ response: ForgotPasswordResponse }>(),
    'Forgot Password Failure': props<{ error: string }>(),

    'Reset Password Request': props<{ token: string; newPassword: string }>(),
    'Reset Password Success': props<{ response: PasswordResetResponse }>(),
    'Reset Password Failure': props<{ error: string }>(),
  },
});
