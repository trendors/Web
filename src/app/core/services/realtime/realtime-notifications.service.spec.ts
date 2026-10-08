import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { provideAppMockStore } from '../../testing/mock-store';
import { FakeSocket } from '../../testing/fake-socket';
import { RealtimeEvent, SocketService } from '../../../socket.service';
import { ToastService } from '../../../components/toast/toast.service';
import { selectAuthToken, selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { NotificationActions } from '../../../store/notification/notification.action';
import { linkPath, RealtimeNotificationsService } from './realtime-notifications.service';

describe('RealtimeNotificationsService', () => {
  let store: MockStore;
  let socket: SocketService;
  let fake: FakeSocket;
  let toast: { show: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    toast = { show: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideAppMockStore({
          selectors: [
            { selector: selectAuthToken, value: 'tok' },
            { selector: selectCurrentUser, value: { id: 1, trendors_id: 'TR-1' } },
          ],
        }),
        { provide: ToastService, useValue: toast },
      ],
    });
    store = TestBed.inject(MockStore);
    socket = TestBed.inject(SocketService);
    router = TestBed.inject(Router);
    fake = new FakeSocket();
    (socket as any).createSocket = vi.fn(() => fake);
    vi.spyOn(store, 'dispatch');
    TestBed.inject(RealtimeNotificationsService).start();
  });

  const push = (link?: string) =>
    fake.serverEmit(RealtimeEvent.Notification, { id: 5, type: 'OFFER_RECEIVED', message: 'New offer', isRead: false, createdAt: '', data: link ? { link } : null });

  it('connects with the session token', () => {
    expect((socket as any).createSocket).toHaveBeenCalledWith(expect.stringMatching(/\/realtime$/), expect.objectContaining({ auth: { token: 'tok' } }));
  });

  it('stores a pushed notification and toasts it', () => {
    push('/home/invite-negotiate/12?campaignId=3');
    expect(store.dispatch).toHaveBeenCalledWith(
      NotificationActions.notificationReceived({ notification: expect.objectContaining({ id: 5 }) as any }),
    );
    expect(toast.show).toHaveBeenCalledWith('New offer', 'info', 5000);
  });

  it('skips the toast when the user is already on that page', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/home/invite-negotiate/12?campaignId=3#negotiation');
    push('/home/invite-negotiate/12?campaignId=3');
    expect(toast.show).not.toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalled();
  });

  it('reloads the list after every (re)connect so nothing missed offline is lost', () => {
    fake.serverEmit('connect');
    expect(store.dispatch).toHaveBeenCalledWith(NotificationActions.loadNotifications({ trendorId: 'TR-1' }));
  });

  it('syncs reads from other tabs', () => {
    fake.serverEmit(RealtimeEvent.NotificationRead, { id: 5 });
    expect(store.dispatch).toHaveBeenCalledWith(NotificationActions.notificationReadElsewhere({ notificationId: 5 }));
  });

  it('disconnects on logout', () => {
    store.overrideSelector(selectAuthToken, null);
    store.refreshState();
    expect(fake.disconnected).toBe(true);
  });

  it('compares link paths without query or fragment', () => {
    expect(linkPath('/home/x/1?campaignId=3#negotiation')).toBe('/home/x/1');
    expect(linkPath(undefined)).toBe('');
  });
});
