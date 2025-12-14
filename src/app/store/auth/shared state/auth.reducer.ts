import { createReducer, on } from '@ngrx/store';
import { User } from '../../../core/models/users/user.model';
import { RegisterActions } from '../register/register.action';
import { LoginActions } from '../login/login.actions';
import { logoutUser } from '../logout/logout.action';


export const authFeatureKey = 'auth';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export const initiaState: AuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
};

export const authReducer = createReducer(
  initiaState,

  on(RegisterActions.registerRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(RegisterActions.registerSuccess, (state, { response }) => ({
    ...state,
    user: response.user,
    isLoggedIn: false,
    isLoading: false,
    error: null,
  })),

  on(RegisterActions.registerFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error || 'Registration failed',
  })),

  on(LoginActions.loginRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(LoginActions.loginSuccess, (state, { response }) => ({
    ...state,
    user: response.user,
    token: response.token,
    isLoggedIn: true,
    isLoading: false,
    error: null,
  })),

  on(LoginActions.loginFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error || 'Login failed',
  })),

  on(logoutUser, () => ({
    ...initiaState,
  }))
);
