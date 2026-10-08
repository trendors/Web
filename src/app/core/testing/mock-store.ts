import { MockStoreConfig, provideMockStore } from '@ngrx/store/testing';
import { authFeatureKey, initiaState as authInitial } from '../../store/auth/sharedState/auth.reducer';
import { campaignFeatureKey, initialState as campaignInitial } from '../../store/campaign/campaign.reducer';
import { invitationFeatureKey, initialState as invitationInitial } from '../../store/invitation/invitation.reducer';
import { notificationsFeatureKey, initialState as notificationsInitial } from '../../store/notification/notification.reducer';
import { postsFeatureKey, initialState as postsInitial } from '../../store/posts/post/posts.reducer';
import { sharesFeatureKey, initialState as sharesInitial } from '../../store/shares/shares.reducer';
import { transactionFeatureKey, initialState as transactionsInitial } from '../../store/transactions/transaction.reducer';
import { userFeatureKey, initialState as userInitial } from '../../store/user/user.reducer';

/** Every feature slice at its real initial state, as the app boots. */
export const appInitialState = {
  [authFeatureKey]: authInitial,
  [campaignFeatureKey]: campaignInitial,
  [invitationFeatureKey]: invitationInitial,
  [notificationsFeatureKey]: notificationsInitial,
  [postsFeatureKey]: postsInitial,
  [sharesFeatureKey]: sharesInitial,
  [transactionFeatureKey]: transactionsInitial,
  [userFeatureKey]: userInitial,
};

/**
 * provideMockStore seeded with the full app state, so selectors over any
 * slice work without each spec rebuilding state. Selector overrides still win.
 */
export function provideAppMockStore(config: Omit<MockStoreConfig<unknown>, 'initialState'> = {}) {
  return provideMockStore({ ...config, initialState: appInitialState });
}
