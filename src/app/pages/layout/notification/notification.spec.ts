import { vi } from 'vitest';
import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore } from '@ngrx/store/testing';

import { NotificationsPage } from './notification';
import { NotificationActions } from '../../../store/notification/notification.action';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import {
  selectAllNotifications,
  selectNotificationsLoading,
} from '../../../store/notification/notification.selector';

describe('NotificationsPage', () => {
  let component: NotificationsPage;
  let fixture: ComponentFixture<NotificationsPage>;
  let store: MockStore;

  const unread = { id: 7, isRead: false, trendors_id: 'TR-1', type: 'system', createdAt: new Date() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsPage],
      providers: [
        provideRouter([]),
        provideAppMockStore({
          selectors: [
            { selector: selectCurrentUser, value: { id: 1, trendors_id: 'TR-1' } },
            { selector: selectAllNotifications, value: [unread] },
            { selector: selectNotificationsLoading, value: false },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(NotificationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should mark a notification read using the current user, without reloading', () => {
    const dispatched: unknown[] = [];
    store.scannedActions$.subscribe((a) => dispatched.push(a));
    dispatched.length = 0; // scannedActions$ replays the last (init) action
    component.onNotificationClick(unread);
    expect(dispatched).toContainEqual(
      NotificationActions.markAsRead({ notificationId: 7, trendorId: 'TR-1' }),
    );
    expect(dispatched.some((a: any) => a.type === NotificationActions.loadNotifications.type)).toBe(false);
  });

  it('opens the notification link and marks it read', async () => {
    const router = TestBed.inject((await import('@angular/router')).Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(store, 'dispatch');
    component.onNotificationClick({ ...unread, data: { link: '/home/invite-negotiate/12?campaignId=3' } });
    expect(nav).toHaveBeenCalledWith('/home/invite-negotiate/12?campaignId=3');
    expect(store.dispatch).toHaveBeenCalledWith(NotificationActions.markAsRead({ notificationId: 7, trendorId: 'TR-1' }));
  });

  it('shows readable type labels', () => {
    expect(component.typeLabel('OFFER_RECEIVED')).toBe('Offer received');
    expect(component.typeLabel('POST LIKED')).toBe('Post liked');
    expect(component.typeLabel(null)).toBe('Notification');
  });
});
