import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
notifications: any[] = [
  {
    id: 1,
    userName: 'Alex Rivera',
    initials: 'AR',
    userColor: '#6366f1',
    message: 'liked your post "How to use CSS Grid"',
    timestamp: new Date(),
    date: 'Today',
    read: false
  },
  {
    id: 2,
    userName: 'Sarah Chen',
    initials: 'SC',
    userColor: '#ec4899',
    message: 'started following you',
    timestamp: new Date(),
    date: 'Yesterday',
    read: true
  }
];
}
