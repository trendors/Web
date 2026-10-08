import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RealtimeEvent, SocketService } from './socket.service';
import { FakeSocket } from './core/testing/fake-socket';

describe('SocketService realtime channel', () => {
  let service: SocketService;
  let sockets: FakeSocket[];
  let createSocket: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SocketService);
    sockets = [];
    createSocket = vi.fn(() => {
      const s = new FakeSocket();
      sockets.push(s);
      return s as any;
    });
    (service as any).createSocket = createSocket;
  });

  it('connects to /realtime with the login token', () => {
    service.connectRealtime('tok-1');
    expect(createSocket).toHaveBeenCalledWith(
      expect.stringMatching(/\/realtime$/),
      expect.objectContaining({ auth: { token: 'tok-1' } }),
    );
  });

  it('does not reconnect for the same token, but swaps the socket for a new one', () => {
    service.connectRealtime('tok-1');
    service.connectRealtime('tok-1');
    expect(createSocket).toHaveBeenCalledTimes(1);
    service.connectRealtime('tok-2');
    expect(createSocket).toHaveBeenCalledTimes(2);
    expect(sockets[0].disconnected).toBe(true);
  });

  it('streams events by name and reports every (re)connect', () => {
    const seen: unknown[] = [];
    let connects = 0;
    service.on(RealtimeEvent.Notification).subscribe((p) => seen.push(p));
    service.connected$.subscribe(() => connects++);
    service.connectRealtime('tok');
    sockets[0].serverEmit('connect');
    sockets[0].serverEmit(RealtimeEvent.Notification, { id: 1 });
    sockets[0].serverEmit(RealtimeEvent.CampaignUpdated, { campaignId: 3 });
    sockets[0].serverEmit('connect');
    expect(seen).toEqual([{ id: 1 }]);
    expect(connects).toBe(2);
  });

  it('changes() tags payloads with the event name', () => {
    const seen: unknown[] = [];
    service.changes(RealtimeEvent.AssignmentUpdated, RealtimeEvent.CampaignUpdated).subscribe((c) => seen.push(c));
    service.connectRealtime('tok');
    sockets[0].serverEmit(RealtimeEvent.AssignmentUpdated, { assignmentId: 5 });
    sockets[0].serverEmit(RealtimeEvent.NegotiationUpdated, { assignmentId: 5 });
    expect(seen).toEqual([{ assignmentId: 5, event: RealtimeEvent.AssignmentUpdated }]);
  });

  it('stops on unauthorized instead of retrying', () => {
    const statuses: string[] = [];
    service.status$.subscribe((s) => statuses.push(s));
    service.connectRealtime('expired');
    sockets[0].serverEmit('unauthorized', {});
    expect(sockets[0].disconnected).toBe(true);
    expect(statuses.at(-1)).toBe('unauthorized');
  });

  it('disconnects on logout', () => {
    service.connectRealtime('tok');
    service.disconnectRealtime();
    expect(sockets[0].disconnected).toBe(true);
    // a new login connects again
    service.connectRealtime('tok');
    expect(createSocket).toHaveBeenCalledTimes(2);
  });
});
