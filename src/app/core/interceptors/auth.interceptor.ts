import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { logoutUser } from '../../store/auth/logout/logout.action';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(Store);
  const platformId = inject(PLATFORM_ID);
  let token: string | null = null;


if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('token');
} else {
   // This code runs on the SERVER (SSR)
   // You can't use localStorage here. 
   // Usually, you just skip token logic or use Cookies if needed.
}

  // Allow callers to opt-out of auth handling by setting header 'x-skip-auth'
  const skipAuthHeader = req.headers.get('x-skip-auth');
  const skipAuth = skipAuthHeader === 'true';
  if (skipAuth) {
    // remove the helper header so it doesn't reach the server
    req = req.clone({ headers: req.headers.delete('x-skip-auth') });
  } else if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If request opted out of auth handling, don't force navigation on 401/403
      if (!skipAuth && (error.status === 401 || error.status === 403)) {
        localStorage.removeItem('token');
        router.navigate(['/login']);
        store.dispatch(logoutUser());
      }
      return throwError(() => error);
    }),
  );
};
