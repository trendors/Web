import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  text: string;
  type?: 'success' | 'error' | 'info';
  id?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private subject = new BehaviorSubject<ToastMessage | null>(null);
  public messages$ = this.subject.asObservable();
  private id = 1;

  show(text: string, type: 'success' | 'error' | 'info' = 'info', timeout = 3000) {
    const msg: ToastMessage = { text, type, id: this.id++ };
    this.subject.next(msg);
    if (timeout > 0) setTimeout(() => this.clear(msg.id!), timeout);
  }

  clear(id?: number) {
    const current = this.subject.getValue();
    if (!id || current?.id === id) this.subject.next(null);
  }
}
