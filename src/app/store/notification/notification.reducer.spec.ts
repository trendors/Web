import { notificationsReducer, initialState } from './notification.reducer';
import { NotificationActions } from './notification.action';

const n = (id: number, isRead = false) => ({ id, type: 'OFFER_RECEIVED', message: `m${id}`, isRead, createdAt: '' });

describe('notifications reducer (realtime)', () => {
  it('puts a pushed notification first', () => {
    const state = { ...initialState, notifications: [n(1)] };
    const next = notificationsReducer(state, NotificationActions.notificationReceived({ notification: n(2) }));
    expect(next.notifications.map((x) => x.id)).toEqual([2, 1]);
  });

  it('ignores a push it already has (reload/push race)', () => {
    const state = { ...initialState, notifications: [n(2), n(1)] };
    expect(notificationsReducer(state, NotificationActions.notificationReceived({ notification: n(2) }))).toBe(state);
  });

  it('marks read when another tab read it', () => {
    const state = { ...initialState, notifications: [n(2), n(1)] };
    const next = notificationsReducer(state, NotificationActions.notificationReadElsewhere({ notificationId: 1 }));
    expect(next.notifications.find((x) => x.id === 1)?.isRead).toBe(true);
    expect(next.notifications.find((x) => x.id === 2)?.isRead).toBe(false);
  });
});
