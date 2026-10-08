import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { MetaReducer, provideStore } from '@ngrx/store';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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
import { campaignFeatureKey, campaignReducer } from './store/campaign/campaign.reducer';
import { CampaignEffects } from './store/campaign/campaign.effects';
import { invitationFeatureKey, invitationReducer } from './store/invitation/invitation.reducer';
import { InvitationEffects } from './store/invitation/invitation.effects';
import {
  transactionFeatureKey,
  transactionReducer,
} from './store/transactions/transaction.reducer';
import { TransactionsEffects } from './store/transactions/transaction.effects';
import { UserEffects } from './store/user/user.effect';
import { ApiModule, Configuration } from './core/api';
import { environment } from '../environments/environment';
import { clearStateOnLogout } from './store/clear-state.meta-reducer';

const metaReducers: MetaReducer[] = [clearStateOnLogout];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The top-up modal uses @angular/animations triggers; without this it throws NG05105.
    provideAnimationsAsync(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    importProvidersFrom(
      ApiModule.forRoot(() => new Configuration({ basePath: environment.apiUrl })),
    ),
    provideStore({
      [authFeatureKey]: authReducer,
      [postsFeatureKey]: postsReducer,
      [userFeatureKey]: userReducer,
      [notificationsFeatureKey]: notificationsReducer,
      [sharesFeatureKey]: sharesReducer,
      [campaignFeatureKey]: campaignReducer,
      [invitationFeatureKey]: invitationReducer,
      [transactionFeatureKey]: transactionReducer,
    }, { metaReducers }),
    provideEffects([
      LoginEffects,
      RegisterEffects,
      PasswordRecoveryEffects,
      ChangePasswordEffects,
      PostsEffects,
      NotificationEffects,
      SharesEffects,
      CampaignEffects,
      InvitationEffects,
      TransactionsEffects,
      UserEffects
    ]),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};
