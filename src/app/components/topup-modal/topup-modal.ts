// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-topup-modal',
//   imports: [],
//   templateUrl: './topup-modal.html',
//   styleUrl: './topup-modal.scss',
// })
// export class TopupModal {

// }



import {
  Component, Output, EventEmitter, inject, signal, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, animate, transition } from '@angular/animations';
import { PaystackService } from '../../core/services/utility/paystack.service';
import { WalletService } from '../../core/services/wallet/wallet.service';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from '../../store/auth/sharedState/auth.selector';
import { take } from 'rxjs';
import { User } from '../../core/models/users/user.model';

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

  constructor() {
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

    // this.http.post('/api/wallet/topup/initiate', {
    //   reference: ref,
    //   amount: this.finalAmount,
    //   email: this.userEmail
    // }).subscribe({
    //   next: () => {
    //     this.openPaystackPopup(ref);
    //   },
    //   error: () => {
    //     this.isProcessing.set(false);
    //     this.errorMsg.set('Could not initiate payment. Try again.');
    //   }
    // });

    // this.walletService.createPendingTopup({
    //   reference: ref,
    //   amount: this.finalAmount,
    //   userId: this.userId,
    // }).subscribe({
    //   next: () => {
    //     this.openPaystackPopup(ref);
    //   },
    //   error: () => {
    //     this.isProcessing.set(false);
    //     this.errorMsg.set('Could not initiate payment. Try again.');
    //   }
    // });
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

  // pay(): void {
  //   if (!this.isValid) {
  //     this.errorMsg.set('Minimum top-up amount is ₦100.');
  //     return;
  //   }

  //   this.isProcessing.set(true);
  //   this.errorMsg.set('');

  //   this.paystack.openPopup({
  //     email: this.userEmail,
  //     amount: this.finalAmount * 100,
  //     ref: this.paystack.generateRef(),
  //     onSuccess: (reference) => {
  //       this.paystack.verifyTransaction(reference).subscribe({
  //         next: () => {
  //           this.isProcessing.set(false);
  //           this.topupSuccess.emit(this.finalAmount);
  //           this.closed.emit();
  //         },
  //         error: () => {
  //           this.isProcessing.set(false);
  //           this.errorMsg.set('Payment received but verification failed. Contact support with your reference: ' + reference);
  //         }
  //       });
  //     },
  //     onClose: () => {
  //       this.isProcessing.set(false);
  //     }
  //   });
  // }

  close(): void {
    if (!this.isProcessing()) this.closed.emit();
  }
}