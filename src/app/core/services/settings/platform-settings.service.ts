import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface PlatformSettings {
  platform_fee_pct: number;
  open_rate_per_click: number;
  open_min_budget: number;
  share_min_pay: number;
  share_campaign_fee_pct: number;
  share_hold_hours: number;
  tier_prices: Record<string, number>;
  invite_expiry_days: number;
}

/** Shown until the server answers (and if it never does), so screens never wait on this. */
export const DEFAULT_SETTINGS: PlatformSettings = {
  platform_fee_pct: 0,
  open_rate_per_click: 70,
  open_min_budget: 25000,
  share_min_pay: 50,
  share_campaign_fee_pct: 20,
  share_hold_hours: 24,
  tier_prices: { Nano: 8000, Micro: 18000, Mid: 40000, Macro: 90000 },
  invite_expiry_days: 7,
};

/**
 * Prices, rates and limits that admins control. The server is the source of
 * truth: it enforces these on its own, so what is shown here is for display
 * and for pre-checking the form.
 */
@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  private http = inject(HttpClient, { optional: true });
  private readonly _values = signal<PlatformSettings>(DEFAULT_SETTINGS);

  readonly values = this._values.asReadonly();
  readonly openRate = computed(() => this._values().open_rate_per_click);
  readonly openMinBudget = computed(() => this._values().open_min_budget);
  readonly shareMinPay = computed(() => this._values().share_min_pay);
  readonly shareFeePct = computed(() => this._values().share_campaign_fee_pct);
  readonly shareHoldHours = computed(() => this._values().share_hold_hours);
  readonly tierPrices = computed(() => this._values().tier_prices);
  readonly inviteExpiryDays = computed(() => this._values().invite_expiry_days);
  readonly platformFeePct = computed(() => this._values().platform_fee_pct);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.http?.get<{ data?: Partial<PlatformSettings> }>(`${environment.apiUrl}/settings/public`).subscribe({
      next: (res) => this._values.set({ ...DEFAULT_SETTINGS, ...(res?.data ?? {}) }),
      error: () => {
        /* keep the defaults */
      },
    });
  }
}
