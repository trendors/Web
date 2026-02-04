import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

    const intervals: { [key: string]: number } = {
      'year': 31536000,
      'month': 2592000,
      'week': 604800,
      'day': 86400,
      'hour': 3600,
      'minute': 60,
      'second': 1
    };

    for (let name in intervals) {
      const counter = Math.floor(seconds / intervals[name]);
      if (counter > 0) {
        return counter === 1 ? `1 ${name} ago` : `${counter} ${name}s ago`;
      }
    }
    return 'just now';
  }
}