import { createReducer, on } from '@ngrx/store';
import { User } from '../../../core/models/users/user.model';
import { RegisterActions } from '../register/register.action';
import { LoginActions, updateCurrentUser } from '../login/login.actions';
import { logoutUser } from '../logout/logout.action';
import { PasswordRecoveryActions } from '../passwordRecovery/password-recovery.actions';
import { PasswordChangeActions } from '../changePassword/change-password.actions';

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
    user: response?.data?.user ?? null,
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
    user: response?.user ?? null,
    token: response?.token ?? null,
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
  })),

  on(PasswordRecoveryActions.forgotPasswordRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(PasswordRecoveryActions.forgotPasswordSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),

  on(PasswordRecoveryActions.forgotPasswordFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error || 'Forgot password failed',
  })),

  on(PasswordRecoveryActions.resetPasswordRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(PasswordRecoveryActions.resetPasswordSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),

  on(PasswordRecoveryActions.resetPasswordFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error || 'Reset password failed',
  })),

  on(PasswordChangeActions.changePasswordRequest, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(PasswordChangeActions.changePasswordSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
  })),

  on(PasswordChangeActions.changePasswordFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error || 'Change password failed',
  })),

  on(updateCurrentUser, (state, { user }) => ({ ...state, user })),
);
