import { Component, EventEmitter, Output } from '@angular/core';

interface DateRange {
  start: Date | null;
  end: Date | null;
}
 
interface CalendarCell {
  date: Date | null;
  disabled: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
}

@Component({
  selector: 'app-calender',
  imports: [],
  templateUrl: './calender.html',
  styleUrl: './calender.scss',
})
export class Calender {
 @Output() rangeConfirmed = new EventEmitter<DateRange>();
 
  readonly weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  readonly presets = [
    { label: '7 days', days: 7 },
    { label: '14 days', days: 14 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: 'Custom', days: null },
  ];
 
  isOpen = false;
  today = this.stripTime(new Date());
  viewDate = this.startOfMonth(new Date());
 
  startDate: Date | null = null;
  endDate: Date | null = null;
  selecting: 'start' | 'end' = 'start';
  activePreset: number | null | 'custom' = null;
 
  weeks: CalendarCell[][] = [];
 
  constructor() {
    this.buildCalendar();
  }
 
  // ---------- sheet open/close ----------
 
  open(): void {
    this.isOpen = true;
  }
 
  close(): void {
    this.isOpen = false;
  }
 
  // ---------- presets ----------
 
  choosePreset(days: number | null): void {
    if (days === null) {
      // "Custom" selected — clear and let the user pick manually
      this.startDate = null;
      this.endDate = null;
      this.selecting = 'start';
      this.activePreset = 'custom';
      this.buildCalendar();
      return;
    }
 
    this.startDate = new Date(this.today);
    this.endDate = new Date(this.today);
    this.endDate.setDate(this.endDate.getDate() + days - 1);
    this.viewDate = this.startOfMonth(this.startDate);
    this.selecting = 'start';
    this.activePreset = days;
    this.buildCalendar();
  }
 
  // ---------- manual field selection ----------
 
  selectField(target: 'start' | 'end'): void {
    this.selecting = target;
  }
 
  // ---------- calendar navigation ----------
 
  prevMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.buildCalendar();
  }
 
  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.buildCalendar();
  }
 
  get monthLabel(): string {
    return this.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
 
  // ---------- date picking ----------
 
  pickDate(cell: CalendarCell): void {
    if (!cell.date || cell.disabled) {
      return;
    }
    const date = cell.date;
    this.activePreset = 'custom';
 
    if (this.selecting === 'start' || !this.startDate) {
      this.startDate = date;
      this.endDate = null;
      this.selecting = 'end';
    } else {
      if (date < this.startDate) {
        this.endDate = this.startDate;
        this.startDate = date;
      } else {
        this.endDate = date;
      }
      this.selecting = 'start';
    }
    this.buildCalendar();
  }
 
  // ---------- confirm ----------
 
  get canConfirm(): boolean {
    return !!(this.startDate && this.endDate);
  }
 
  get durationLabel(): string {
    if (!this.startDate || !this.endDate) {
      return '';
    }
    const days = Math.round((this.endDate.getTime() - this.startDate.getTime()) / 86400000) + 1;
    return `${days} day${days === 1 ? '' : 's'} campaign`;
  }
 
  confirm(): void {
    if (!this.canConfirm) {
      return;
    }
    this.rangeConfirmed.emit({ start: this.startDate, end: this.endDate });
    this.close();
  }
 
  // ---------- display helpers ----------
 
  formatShort(date: Date | null): string {
    if (!date) {
      return '';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
 
  get launcherLabel(): string {
    if (this.startDate && this.endDate) {
      return `${this.formatShort(this.startDate)} → ${this.formatShort(this.endDate)}`;
    }
    return 'Set campaign start & end date';
  }
 
  // ---------- calendar building ----------
 
  private buildCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
 
    const cells: CalendarCell[] = [];
 
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ date: null, disabled: true, isToday: false, isStart: false, isEnd: false, inRange: false });
    }
 
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isStart = this.sameDay(date, this.startDate);
      const isEnd = this.sameDay(date, this.endDate);
      const inRange = !!(
        this.startDate &&
        this.endDate &&
        date > this.startDate &&
        date < this.endDate
      );
 
      cells.push({
        date,
        disabled: date < this.today,
        isToday: this.sameDay(date, this.today),
        isStart,
        isEnd,
        inRange,
      });
    }
 
    // pad to complete final week
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, disabled: true, isToday: false, isStart: false, isEnd: false, inRange: false });
    }
 
    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }
 
  private sameDay(a: Date | null, b: Date | null): boolean {
    return !!a && !!b && a.toDateString() === b.toDateString();
  }
 
  private stripTime(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
 
  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
