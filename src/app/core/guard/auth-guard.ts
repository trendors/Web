import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { take, map } from 'rxjs';
import { selectIsLoggedIn } from '../../store/auth/sharedState/auth.selector';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const store = inject(Store);

   const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  
  try {
    const token = localStorage.getItem('token');
    if (token) return true;
  } catch (e) {
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
