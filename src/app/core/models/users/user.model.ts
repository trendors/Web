export interface User {
  id: number;
  user_name: string;
  first_name: string;
  last_name: string;
  trendors_id: string;
  phone_number?: string;
  email: string;
  twitter_handle?: string;
  facebook_username?: string;
  instagram_handle?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface LoginResponse {
  token: string;
  user: User | null;
  error: boolean;
  message: string;
}

export interface RegisterResponse {
  user: User;
  error: boolean;
  message: string;
}

export interface RegisterDto {
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  message: string;
  error: boolean;
}

export interface ChangePasswordResponse {
  message: string;
  error: boolean;
}

export interface ForgetPasswordResponse {
  message: string;
  error: boolean;
}
