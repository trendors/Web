import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { authReducer } from './store/auth/shared state/auth.reducer';
import { LoginEffects } from './store/auth/login/login.effects';
import { RegisterEffects } from './store/auth/register/register.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideStore({
      auth: authReducer,
    }),
    provideEffects([
      LoginEffects,
      RegisterEffects
    ]),
  ],
};
