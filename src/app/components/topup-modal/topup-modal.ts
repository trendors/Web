
import {
  Component,
  Output,
  EventEmitter,
  inject,
  signal,
  Input,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule, DecimalPipe, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  style,
  animate,
  transition
} from '@angular/animations';

import { Store } from '@ngrx/store';
import { HttpClient } from '@angular/common/http';
import { take } from 'rxjs';

import { PaystackService } from '../../core/services/utility/paystack.service';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { User } from '../../core/models/users/user.model';
import { environment } from '../../../environments/environment.development';

declare var PaystackPop: any;

@Component({
  selector: 'app-topup-modal',
  standalone: true,
  imports: [
    CommonModule,
    NgFor,
    DecimalPipe,
    FormsModule
  ],
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
        style({
          opacity: 0,
          transform: 'translateY(20px) scale(0.98)'
        }),
        animate(
          '220ms cubic-bezier(.4,0,.2,1)',
          style({
            opacity: 1,
            transform: 'translateY(0) scale(1)'
          })
        )
      ]),

      transition(':leave', [
        animate(
          '180ms cubic-bezier(.4,0,.2,1)',
          style({
            opacity: 0,
            transform: 'translateY(10px) scale(0.98)'
          })
        )
      ])
    ])
  ],
  templateUrl: './topup-modal.html',
  styleUrl: './topup-modal.scss',
})
export class TopupModalComponent implements OnInit {

  @Input() userEmail = '';
  @Input() amount?: number;
  @Input() fixedAmount = false;
  @Output() closed = new EventEmitter<void>();
  @Output() topupSuccess = new EventEmitter<any>();

  private http = inject(HttpClient);
  private store = inject(Store);

  user: User | null = null;

  presets = [
    1_000,
    2_000,
    5_000,
    10_000,
    20_000,
    50_000
  ];

  selectedPreset: number | null = null;
  customAmount = '';
  isProcessing = signal(false);
  errorMsg = signal('');

private cdr = inject(ChangeDetectorRef);

ngOnInit(): void {
  this.initializeAmount();

  this.store
    .select(selectCurrentUser)
    .pipe(take(1))
    .subscribe((user) => {
      if (user) {
        this.user = user;
        this.userEmail = user.email;
        this.cdr.markForCheck(); // or detectChanges()
      }
    });
}

  private initializeAmount(): void {

    if (this.amount === undefined || this.amount === null) {
      return;
    }

    if (this.amount < 100) {
      this.errorMsg.set('Minimum top-up is ₦100.');
      return;
    }

    if (this.presets.includes(this.amount)) {

      this.selectedPreset = this.amount;
      this.customAmount = '';

    } else {

      this.selectedPreset = null;
      this.customAmount = this.amount.toString();

    }
  }


  // ─────────────────────────────────────────────────────────────
  // Final Amount
  // ─────────────────────────────────────────────────────────────

  get finalAmount(): number {

    if (this.fixedAmount && this.amount !== undefined) {
      return this.amount;
    }

    return this.selectedPreset ??
      (parseInt(this.customAmount, 10) || 0);
  }

  get isValid(): boolean {
    return this.finalAmount >= 100;
  }

  selectPreset(amount: number): void {

    if (this.fixedAmount) {
      return;
    }

    this.selectedPreset = amount;

    this.customAmount = '';

    this.errorMsg.set('');
  }

  onCustomInput(): void {

    if (this.fixedAmount) {
      return;
    }

    this.selectedPreset = null;

    this.errorMsg.set('');
  }

  initiatePayment(): void {

    if (!this.isValid) {

      this.errorMsg.set(
        'Minimum top-up is ₦100.'
      );

      return;
    }

    this.isProcessing.set(true);

    this.errorMsg.set('');


    this.http
      .post<{ data: { reference: string } }>(
        `${environment.apiUrl}/utility/initialize`,
        {
          email: this.userEmail,

          // Paystack expects amount in kobo
          amount: this.finalAmount * 100,

          trendors_id: this.user?.trendors_id,
        }
      )
      .subscribe({

        next: (res) => {
          this.launchPaystack(res.data);
        },

        error: (err) => {

          this.isProcessing.set(false);

          this.errorMsg.set(
            err?.error?.message ??
            'Could not initialize payment. Try again.'
          );

          console.error(
            'Initialize error:',
            err
          );
        }

      });
  }

  private launchPaystack(
    paymentData: { reference: string }
  ): void {

    const handler = PaystackPop.setup({

      key: environment.paystackPublicKey,

      email: this.userEmail,

      // Paystack expects kobo
      amount: this.finalAmount * 100,

      ref: paymentData.reference,

      currency: 'NGN',

      channels: [
        'card',
        'bank',
        'bank_transfer',
        'ussd',
        'qr',
        'eft'
      ],

      onClose: () => {
        this.isProcessing.set(false);
      },

      onSuccess: (response: any) => {

        this.isProcessing.set(false);

        this.topupSuccess.emit(response);

        this.closed.emit();
      }

    });

    handler.openIframe();
  }


  close(): void {

    if (!this.isProcessing()) {
      this.closed.emit();
    }
  }
}