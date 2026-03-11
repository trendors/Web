import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment.development';

export interface PaystackConfig {
  email: string;
  amount: number; // in kobo
  ref: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

declare const PaystackPop: any;

@Injectable({ providedIn: 'root' })
export class PaystackService {
  private http = inject(HttpClient);

  generateRef(): string {
    return `TOP_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  openPopup(config: PaystackConfig): void {
    const handler = PaystackPop.setup({
      key: environment.paystackPublicKey,
      email: config.email,
      amount: config.amount, // must be in kobo (multiply naira × 100)
      ref: config.ref,
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'mobile_money'],
      callback: (response: { reference: string }) => {
        config.onSuccess(response.reference);
      },
      onClose: () => {
        config.onClose();
      }
    });

    handler.openIframe();
  }

  // Call your backend to verify — never trust client-side confirmation alone
  verifyTransaction(reference: string) {
    return this.http.post(`${environment.apiUrl}/wallet/verify`, { reference });
  }
}