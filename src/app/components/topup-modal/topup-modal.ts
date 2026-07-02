
import {
  Component, Output, EventEmitter, inject, signal, Input
} from '@angular/core';
import { CommonModule, DecimalPipe, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { PaystackService } from '../../core/services/utility/paystack.service';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { User } from '../../core/models/users/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { take } from 'rxjs';
declare var PaystackPop: any;


@Component({
  selector: 'app-topup-modal',
  standalone: true,
  imports: [NgFor, DecimalPipe, FormsModule, FormsModule],
  animations: [
    trigger('backdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0 }))
      ])
    ]),
    trigger('modal', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.98)' }),
        animate('220ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('180ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 0, transform: 'translateY(10px) scale(0.98)' }))
      ])
    ])
  ],
  templateUrl: './topup-modal.html',
  styleUrl: './topup-modal.scss',
})
export class TopupModalComponent {

  // ── Inputs / Outputs ──────────────────────────────────────────────────────
  @Input() userEmail = '';
  @Output() closed = new EventEmitter<void>();
  @Output() topupSuccess = new EventEmitter<any>();
 
  // ── DI ───────────────────────────────────────────────────────────────────
  private http = inject(HttpClient);
  private store = inject(Store);
 
  // ── State ─────────────────────────────────────────────────────────────────
  user: User | null = null;
  datas = [1,2,3,4,5]
  presets = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000];
  selectedPreset: number | null = null;
  customAmount = '';
  isProcessing = signal(false);
  errorMsg = signal('');
 
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
      console.log('presets on init:', this.presets); // should log 6 items

    this.store
      .select(selectCurrentUser)
      .pipe(take(1))
      .subscribe((user) => {
        if (user) {
          this.user = user;
          this.userEmail = user.email;
        }
      });
  }
 
  get finalAmount(): number {
    return this.selectedPreset ?? (parseInt(this.customAmount, 10) || 0);
  }
 
  get isValid(): boolean {
    return this.finalAmount >= 100;
  }
 
  selectPreset(amount: number): void {
    this.selectedPreset = amount;
    this.customAmount = '';
    this.errorMsg.set('');
  }
 
  onCustomInput(): void {
    this.selectedPreset = null;
    this.errorMsg.set('');
  }
 
  // ── Payment flow ──────────────────────────────────────────────────────────
  initiatePayment(): void {
    if (!this.isValid) {
      this.errorMsg.set('Minimum top-up is ₦100.');
      return;
    }
 
    this.isProcessing.set(true);
    this.errorMsg.set('');
 
    this.http
      .post<{ data: { reference: string } }>(
        `${environment.apiUrl}/utility/initialize`,
        {
          email: this.userEmail,
          amount: this.finalAmount * 100, // kobo
          trendors_id: this.user?.trendors_id,
        }
      )
      .subscribe({
        next: (res) => this.launchPaystack(res.data),
        error: (err) => {
          this.isProcessing.set(false);
          this.errorMsg.set(
            err?.error?.message ?? 'Could not initialize payment. Try again.'
          );
          console.error('Initialize error:', err);
        },
      });
  }
 
  private launchPaystack(paymentData: { reference: string }): void {
    const handler = PaystackPop.setup({
      key: environment.paystackPublicKey,
      email: this.userEmail,
      amount: this.finalAmount * 100,
      ref: paymentData.reference,
      currency: 'NGN',
      channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr', 'eft'],
 
      onClose: () => {
        // User dismissed — don't close the modal, let them retry
        this.isProcessing.set(false);
      },
 
      onSuccess: (response: any) => {
        this.isProcessing.set(false);
        this.topupSuccess.emit(response);
        this.closed.emit();
      },
    });
 
    handler.openIframe();
  }
 
  // ── Close ─────────────────────────────────────────────────────────────────
  close(): void {
    if (!this.isProcessing()) {
      this.closed.emit();
    }
  }
}