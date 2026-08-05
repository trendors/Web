import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { take, map } from 'rxjs';
import { selectIsLoggedIn } from '../../store/auth/sharedState/auth.selector';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(Store);
  // Fast-path: if a token exists in localStorage, allow navigation immediately.
  // This prevents the app from redirecting to `/login` on cold restarts
  // while the store is still being hydrated by effects.
  try {
    const token = localStorage.getItem('access_token');
    if (token) return true;
  } catch (e) {
    // ignore (e.g., in non-browser environments)
  }

  return store.select(selectIsLoggedIn).pipe(
    take(1),
    map((isLoggedIn) => {
      if (isLoggedIn) {
        return true;
      }
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }),
  );
};
