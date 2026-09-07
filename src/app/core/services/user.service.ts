import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, UpdateUserDto, User } from '../models/users/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/user`;

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Userservice Error:', error);
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

  updateUser(userId: number, updateData: UpdateUserDto): Observable<ApiResponse<User>> {
    return this.http
      .patch<ApiResponse<User>>(`${this.apiUrl}/${userId}`, updateData)
      .pipe(catchError(this.handleError));
  }

  deleteUser(userId: number): Observable<ApiResponse<null>> {
    return this.http
      .delete<ApiResponse<null>>(`${this.apiUrl}/${userId}`)
      .pipe(catchError(this.handleError));
  }
}