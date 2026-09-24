
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

import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  style,
  animate,
  transition
} from '@angular/animations';

import { Store } from '@ngrx/store';
import { take, timeout } from 'rxjs';

import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { User } from '../../core/models/users/user.model';
import { environment } from '../../../environments/environment.development';
import { UtilityService } from '../../core/api';
import { ToastService } from '../toast/toast.service';

declare var PaystackPop: any;

@Component({
  selector: 'app-topup-modal',
  standalone: true,
  imports: [
    CommonModule,
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

  private store = inject(Store);
  private utilityApi = inject(UtilityService);
  private toast = inject(ToastService);

  user?: User

  // Static presets: always rendered, never gated behind entered amounts.
  readonly presets = [
    1_000,
    2_000,
    5_000,
    10_000,
    20_000,
    50_000
  ];

  selectedPreset = signal<number | null>(null);
  customAmount = '';
  isProcessing = signal(false);
  errorMsg = signal('');
  successMsg = signal('');


  awaitingConfirmation = signal(false);
  private pendingReference: string | null = null;

  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.initializeAmount();

    this.store
      .select(selectCurrentUser)
      .pipe(take(1))
      .subscribe((user) => {
        if (user) {
          this.user = user as User;
          this.userEmail = user.email as string;
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

      this.selectedPreset.set(this.amount);
      this.customAmount = '';

    } else {

      this.selectedPreset.set(null);
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

    return this.selectedPreset() ??
      (parseInt(this.customAmount, 10) || 0);
  }

  get isValid(): boolean {
    return this.finalAmount >= 100;
  }

  selectPreset(amount: number): void {

    if (this.fixedAmount) {
      return;
    }

    this.selectedPreset.set(amount);

    this.customAmount = '';

    this.resetStatus();
  }

  onCustomInput(): void {

    if (this.fixedAmount) {
      return;
    }

    this.selectedPreset.set(null);

    this.resetStatus();
  }

  /** Clear any previous outcome when the user starts over. */
  private resetStatus(): void {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.awaitingConfirmation.set(false);
    this.pendingReference = null;
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
    this.successMsg.set('');

    // Initialize the Paystack transaction via the SDK (core/api) instead of a
    // hand-rolled HttpClient post. (Paystack expects the amount in kobo.)
    this.utilityApi
      .utilityControllerInitialize({
        email: this.userEmail,
        trendors_id: String(this.user?.trendors_id ?? ''),
        amount: this.finalAmount * 100,
      })
      .pipe(
        // A hanging backend must never leave the button on "Processing…" forever.
        timeout(30000),
      )
      .subscribe({

        next: (res) => {
          this.launchPaystack(res?.data ?? res);
        },

        error: (err) => {

          this.isProcessing.set(false);

          this.errorMsg.set(
            err?.name === 'TimeoutError'
              ? 'Payment initialization timed out. Please try again.'
              : (err?.error?.message ??
                'Could not initialize payment. Try again.')
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

    try {
      if (typeof PaystackPop === 'undefined' || typeof PaystackPop.setup !== 'function') {
        throw new Error('Payment popup could not load. Check your connection and try again.');
      }

      if (!paymentData?.reference) {
        throw new Error('Could not start payment: missing transaction reference.');
      }

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

        callback: (response: any) => {          // <-- was onSuccess
          console.log('Topup Succesdful:', response);
          this.isProcessing.set(false);
          this.pendingReference = response?.reference ?? paymentData.reference;
          this.awaitingConfirmation.set(true);
        },

        onClose: () => {
          this.isProcessing.set(false);
          console.log('Payment popup closed by user.');
        }

      })

      handler.openIframe();
    } catch (err: any) {
      // A synchronous throw here (blocked popup script, bad reference) would
      // otherwise leave the button stuck on "Processing…" forever.
      this.isProcessing.set(false);
      const message = err?.message || 'Could not start payment. Try again.';
      this.errorMsg.set(message);
      console.error('Launch Paystack error:', err);
    }
  }




  close(): void {

    if (!this.isProcessing()) {
      this.closed.emit();
    }
  }

  confirmCompletion(): void {

    if (!this.pendingReference) {
      this.errorMsg.set('Missing payment reference. Please contact support.');
      return;
    }

    // The backend credits the wallet via the Paystack webhook — here we only
    // record the user's confirmation as the success status.
    this.awaitingConfirmation.set(false);
    this.successMsg.set('Topup Succesdful. Your wallet will be credited shortly.');
    this.toast.show('Topup Succesdful.', 'success');
    this.topupSuccess.emit({ reference: this.pendingReference, amount: this.finalAmount });
    this.pendingReference = null;
    // Briefly show the Completed status, then disappear via the parent.
    setTimeout(() => this.closed.emit(), 1500);

  }



}