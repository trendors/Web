/** Minimal stand-in for a socket.io client socket, driven by tests. */
export class FakeSocket {
  private handlers = new Map<string, ((...args: any[]) => void)[]>();
  private anyHandlers: ((event: string, ...args: any[]) => void)[] = [];
  disconnected = false;

  on(event: string, handler: (...args: any[]) => void): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  off(event: string, handler: (...args: any[]) => void): this {
    this.handlers.set(event, (this.handlers.get(event) ?? []).filter((h) => h !== handler));
    return this;
  }
  onAny(handler: (event: string, ...args: any[]) => void): this {
    this.anyHandlers.push(handler);
    return this;
  }
  offAny(): this {
    this.anyHandlers = [];
    return this;
  }
  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }
  disconnect(): this {
    this.disconnected = true;
    return this;
  }

  /** Simulate the server: lifecycle events go to `on` handlers, app events to `onAny`. */
  serverEmit(event: string, payload?: unknown): void {
    for (const h of this.handlers.get(event) ?? []) h(payload);
    if (!['connect', 'disconnect', 'connect_error'].includes(event)) {
      for (const h of this.anyHandlers) h(event, payload);
    }
  }
}
