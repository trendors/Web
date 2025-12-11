import { createReducer, on } from '@ngrx/store';
import { AuthState } from '../../../core/models/users/user.model';
import * as LoginActions from '../login/login.actions';
import * as RegisterActions from '../register/register.action';
import * as LogoutUser from '../logout/logout.action';

export const authFeatureKey = 'auth';

export const initiaState: AuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initiaState,

  on(RegisterActions.registerUser, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(RegisterActions.registerUserSuccess, (state, { registerResponse }) => ({
    ...state,
    user: registerResponse.user,
    isLoggedIn: false,
    loading: false,
    error: null,
  })),

  on(RegisterActions.registerUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: error || 'Registration failed',
  })),

  on(LoginActions.loginUser, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(LoginActions.loginUserSuccess, (state, { loginResponse }) => ({
    ...state,
    user: loginResponse.user,
    token: loginResponse.token,
    isLoggedIn: true,
    loading: false,
    error: null,
  })),

  on(LoginActions.loginUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: error || 'Login failed',
  })),

  on(LogoutUser.logoutUser, () => ({
    ...initiaState,
  }))
);
