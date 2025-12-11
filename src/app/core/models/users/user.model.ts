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
  user: User;
  error: boolean;
  messasge: string;
}

export interface RegisterResponse {
  user: User;
  error: boolean;
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
}

export interface RegisterDto {
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number?: string;
}