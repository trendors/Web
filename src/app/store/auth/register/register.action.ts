import { createAction, props } from '@ngrx/store';
import { RegisterResponse, User } from '../../../core/models/users/user.model';

export const registerUser = createAction('[Register Page] Register User', props<{ user: User }>());

export const registerUserSuccess = createAction(
  '[Register API] Register User Success',
  props<{ registerResponse: RegisterResponse }>()
);

export const registerUserFailure = createAction(
  '[Register API] Register User Failure',
  props<{ error: string }>()
);
