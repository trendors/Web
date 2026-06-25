import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss']
})
export class ToastComponent {
  vm$: any;
  constructor(private toast: ToastService) {
    this.vm$ = this.toast.messages$;
  }
}

