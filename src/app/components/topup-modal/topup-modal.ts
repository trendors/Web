
import {
  Component, Output, EventEmitter, inject, signal, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule],
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
  @Input() userEmail = '';
  @Output() closed = new EventEmitter<void>();
  @Output() topupSuccess = new EventEmitter<number>(); // emits amount topped up
  private store = inject(Store);
  user: User | null = null;

  currentUser$ = this.store.select(selectCurrentUser);
  walletBalance?: number;

  amount: number = 0;
  loading = false;

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.user = user;
        this.userEmail = user.email;
        console.log('Current user in TopupModalComponent:', user);
      }
    });
  }

  private paystack = inject(PaystackService);

  presets = [1000, 2000, 5000, 10000, 20000, 50000];
  selectedPreset: number | null = null;
  customAmount = '';
  isProcessing = signal(false);
  errorMsg = signal('');

  get finalAmount(): number {
    return this.selectedPreset ?? (parseInt(this.customAmount) || 0);
  }

  get isValid(): boolean {
    return this.finalAmount >= 100; // ₦100 minimum
  }

  initiatePayment() {


    this.loading = true;

    this.http.post(`${environment.apiUrl}/utility/initialize`, {
      email: this.userEmail,
      amount: this.finalAmount * 100,
      trendors_id: this.user?.trendors_id 
    }).subscribe({
      next: (res: any) => {
        this.launchPaystack(res.data);
      },
      error: (err) => {
        this.loading = false;
        alert('Could not initialize payment');
        console.error(err);
      }
    });
  }

  launchPaystack(paymentData: any) {
    const handler = PaystackPop.setup({
      key: environment.paystackPublicKey,
      email: this.userEmail,
      amount: this.finalAmount * 100,
      ref: paymentData.reference, 
      currency: 'NGN',
      channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr', 'eft'],
      onClose: () => {
        this.loading = false;
        console.log('Payment window closed');
        this.closed.emit();
      },
      onSuccess: (response: any) => {
        this.loading = false;
        console.log('Payment successful:', response);

        

        // this.verifyPayment(response.reference);

        this.topupSuccess.emit(response);
      }
    });

    handler.openIframe();
  }


  verifyPayment(reference: string) {
    this.http.post(`${environment.apiUrl}/payments/verify`, {
      reference: reference,
      email: this.userEmail,
      amount: this.finalAmount * 100,
    }).subscribe({
      next: (res: any) => {
        console.log('Payment verified:', res);
        alert('Payment successful! Account topped up.');
      },
      error: (err) => {
        console.error('Verification failed:', err);
      }
    });
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


  pay(): void {
    if (!this.isValid) {
      this.errorMsg.set('Minimum top-up amount is ₦100.');
      return;
    }
    this.isProcessing.set(true);
    this.errorMsg.set('');
    const ref = this.paystack.generateRef();
  }

  private openPaystackPopup(ref: string): void {
    this.paystack.openPopup({
      email: this.userEmail,
      amount: this.finalAmount * 100,
      ref,
      onSuccess: () => {
        this.isProcessing.set(false);
        this.topupSuccess.emit(this.finalAmount);
        this.closed.emit();
      },
      onClose: () => {
        this.isProcessing.set(false);
      }
    });
  }

  close(): void {
    if (!this.isProcessing()) this.closed.emit();
  }
}