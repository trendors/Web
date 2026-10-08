import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { isPlatformBrowser } from '@angular/common';

function readToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Callers can opt out of auth handling with the 'x-skip-auth' helper header.
  const skipAuth = req.headers.get('x-skip-auth') === 'true';
  const token = isBrowser && !skipAuth ? readToken() : null;

  if (skipAuth) {
    req = req.clone({ headers: req.headers.delete('x-skip-auth') });
  } else if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only a rejected token means the session is over. 403 is a permission
      // error on one resource and must not log the user out.
      // Re-reading the token dedupes bursts of 401s: the first logout clears
      // it, so later failures from the same burst don't dispatch again.
      if (error.status === 401 && token && readToken() === token) {
        store.dispatch(logoutUser());
      }
      return throwError(() => error);
    }),
  );
};
