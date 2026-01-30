import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { authFeatureKey, authReducer } from './store/auth/shared state/auth.reducer';
import { LoginEffects } from './store/auth/login/login.effects';
import { RegisterEffects } from './store/auth/register/register.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { PasswordRecoveryEffects } from './store/auth/passwordRecovery/password-recovery.effects';
import { ChangePasswordEffects } from './store/auth/changePassword/change-password.effects';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { postsFeatureKey, postsReducer } from './store/posts/post/posts.reducer';
import { PostsEffects } from './store/posts/post/posts.effects';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideStore({
      [authFeatureKey]: authReducer,
      [postsFeatureKey]: postsReducer
    }),
    provideEffects([LoginEffects, RegisterEffects, PasswordRecoveryEffects, ChangePasswordEffects, PostsEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }), provideClientHydration(withEventReplay()),
  ],
};
