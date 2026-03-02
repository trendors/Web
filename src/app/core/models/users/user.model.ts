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

export interface ApiResponse<T = null> {
  message: string;
  error: boolean;
  data?: T;
  token?: string;
}

export type LoginResponse = {
  token: string;
  user: User | null;
  message: string;
  error: boolean;
};

export type RegisterResponse = ApiResponse<{
  user: User;
}>;

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

export interface UpdateUserDto {
  user_name?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  twitter_handle?: string;
  instagram_handle?: string;
  facebook_username?: string;
}

export type PasswordResetResponse = ApiResponse<null>;

export type ChangePasswordResponse = ApiResponse<null>;

export type ForgotPasswordResponse = ApiResponse<{ resetToken: string }>;
