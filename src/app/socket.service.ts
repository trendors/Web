import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, EMPTY, Observable, Subject, filter, map } from 'rxjs';
import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { environment } from '../environments/environment';

/** Events the server sends on the logged-in `/realtime` channel. */
export const RealtimeEvent = {
  Notification: 'notification',
  NotificationRead: 'notification:read',
  AssignmentUpdated: 'assignment:updated',
  NegotiationUpdated: 'negotiation:updated',
  CampaignPostUpdated: 'campaign-post:updated',
  CampaignUpdated: 'campaign:updated',
} as const;

/** Refresh-signal payload: which assignment/campaign changed. */
export interface RealtimeChange {
  assignmentId?: number;
  campaignId?: number;
  offerId?: number;
  postId?: number;
  status?: string;
  change?: string;
}

export type RealtimeStatus = 'disconnected' | 'connected' | 'unauthorized';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private socket: Socket | null = null;

  /** Public feed (new posts): no login needed. */
  private connection(): Socket | null {
    if (!this.isBrowser) return null;
    this.socket ??= this.createSocket(environment.apiUrl);
    return this.socket;
  }

  listenToNewPosts(): Observable<any> {
    const socket = this.connection();
    if (!socket) return EMPTY;
    return new Observable((observer) => {
      const handler = (data: unknown) => observer.next(data);
      socket.on('new-post', handler);
      // Remove the listener on unsubscribe so revisits don't stack handlers.
      return () => socket.off('new-post', handler);
    });
  }

  /* ------------------------------------------------ logged-in realtime channel */

  private realtime: Socket | null = null;
  private realtimeToken: string | null = null;
  private readonly incoming = new Subject<{ event: string; payload: unknown }>();
  private readonly statusSubject = new BehaviorSubject<RealtimeStatus>('disconnected');
  private readonly connectedSubject = new Subject<void>();

  /** Current connection state. */
  readonly status$ = this.statusSubject.asObservable();
  /** Fires on every (re)connect: a good moment to reload anything missed while offline. */
  readonly connected$ = this.connectedSubject.asObservable();

  /** Overridable for tests. */
  protected createSocket(url: string, opts?: Partial<ManagerOptions & SocketOptions>): Socket {
    return io(url, opts);
  }

  /** Open (or re-open with a new token) the `/realtime` channel. No-op on the server. */
  connectRealtime(token: string): void {
    if (!this.isBrowser || !token) return;
    if (this.realtime && this.realtimeToken === token) return;
    this.disconnectRealtime();

    this.realtimeToken = token;
    const socket = this.createSocket(`${environment.apiUrl.replace(/\/+$/, '')}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    this.realtime = socket;

    socket.on('connect', () => {
      this.statusSubject.next('connected');
      this.connectedSubject.next();
    });
    socket.on('disconnect', () => {
      if (this.statusSubject.value !== 'unauthorized') this.statusSubject.next('disconnected');
    });
    // The server rejects bad/expired tokens; stop instead of retrying forever.
    socket.on('unauthorized', () => {
      this.statusSubject.next('unauthorized');
      socket.disconnect();
    });
    socket.onAny((event: string, payload: unknown) => this.incoming.next({ event, payload }));
  }

  disconnectRealtime(): void {
    if (this.realtime) {
      this.realtime.offAny();
      this.realtime.removeAllListeners();
      this.realtime.disconnect();
    }
    this.realtime = null;
    this.realtimeToken = null;
    if (this.statusSubject.value !== 'disconnected') this.statusSubject.next('disconnected');
  }

  /** Stream of one realtime event's payloads. Safe to subscribe before connecting. */
  on<T = unknown>(event: string): Observable<T> {
    return this.incoming.pipe(
      filter((m) => m.event === event),
      map((m) => m.payload as T),
    );
  }

  /** Refresh signals of the given kinds (assignment/negotiation/post/campaign changes). */
  changes(...events: string[]): Observable<RealtimeChange & { event: string }> {
    return this.incoming.pipe(
      filter((m) => events.includes(m.event)),
      map((m) => ({ ...((m.payload ?? {}) as RealtimeChange), event: m.event })),
    );
  }
}
