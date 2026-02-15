import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { authFeatureKey, authReducer } from './store/auth/sharedState/auth.reducer';
import { LoginEffects } from './store/auth/login/login.effects';
import { RegisterEffects } from './store/auth/register/register.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { PasswordRecoveryEffects } from './store/auth/passwordRecovery/password-recovery.effects';
import { ChangePasswordEffects } from './store/auth/changePassword/change-password.effects';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { postsFeatureKey, postsReducer } from './store/posts/post/posts.reducer';
import { PostsEffects } from './store/posts/post/posts.effects';
import { userFeatureKey, userReducer } from './store/user/user.reducer';
import {
  notificationsFeatureKey,
  notificationsReducer,
} from './store/notification/notification.reducer';
import { NotificationEffects } from './store/notification/notification.effects';
import { sharesFeatureKey, sharesReducer } from './store/shares/shares.reducer';
import { SharesEffects } from './store/shares/shares.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore({
      [authFeatureKey]: authReducer,
      [postsFeatureKey]: postsReducer,
      [userFeatureKey]: userReducer,
      [notificationsFeatureKey]: notificationsReducer,
      [sharesFeatureKey]: sharesReducer,
    }),
    provideEffects([
      LoginEffects,
      RegisterEffects,
      PasswordRecoveryEffects,
      ChangePasswordEffects,
      PostsEffects,
      NotificationEffects,
      SharesEffects,
    ]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
