import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { LoginResponse, RegisterDto, RegisterResponse } from '../../models/users/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/user';

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
}
