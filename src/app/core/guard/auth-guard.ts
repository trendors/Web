import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { isTokenExpired } from '../utils/jwt';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  // Protected routes render client-side only (see app.routes.server.ts); the
  // server has no token to check, so let the browser make the decision.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  let token: string | null = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    token = null;
  }
  if (!isTokenExpired(token)) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
