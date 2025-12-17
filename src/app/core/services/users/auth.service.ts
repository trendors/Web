import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import {
  ChangePasswordDto,
  ChangePasswordResponse,
  ForgetPasswordResponse,
  ForgotPasswordDto,
  LoginResponse,
  PasswordResetResponse,
  RegisterDto,
  RegisterResponse,
  ResetPasswordDto,
} from '../../models/users/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/user';

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('AuthService Error:', error);
    let errorMessage: string;

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      errorMessage = Array.isArray(error.error.message)
        ? error.error.message[0]
        : error.error.message;
    } else {
      errorMessage = `Server returned code: ${error.status}, error message is: ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  login(emailOrPhone: string, password: string): Observable<LoginResponse> {
    const params = new HttpParams().set('emailOrPhone', emailOrPhone).set('password', password);
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, {}, { params })
      .pipe(catchError(this.handleError));
  }

  register(userData: RegisterDto): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.apiUrl}/register`, userData)
      .pipe(catchError(this.handleError));
  }

  forgetPassword(data: ForgotPasswordDto): Observable<ForgetPasswordResponse> {
    return this.http
      .post<ForgetPasswordResponse>(`${this.apiUrl}/forgot-password`, data)
      .pipe(catchError(this.handleError));
  }

  changePassword(data: ChangePasswordDto): Observable<ChangePasswordResponse> {
    return this.http
      .post<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data)
      .pipe(catchError(this.handleError));
  }

  resetPassword(userId: number, data: ResetPasswordDto): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.apiUrl}/reset-password/${userId}`, data)
      .pipe(catchError(this.handleError));
  }
}
