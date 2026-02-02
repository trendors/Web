import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-notification',
  imports: [DatePipe],
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class NotificationItem {
  @Input() notification: any;
  @Output() markRead = new EventEmitter<number>();

  onMarkRead() {
    this.markRead.emit(this.notification.id);
  }
}
