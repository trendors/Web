import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { TopupModalComponent } from './topup-modal';
import { UtilityService } from '../../core/api';
import { ToastService } from '../toast/toast.service';

describe('TopupModalComponent', () => {
  let component: TopupModalComponent;
  let fixture: ComponentFixture<TopupModalComponent>;
  let utilityApi: { utilityControllerInitialize: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };
  let paystackOpen: ReturnType<typeof vi.fn>;
  let paystackSetup: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    utilityApi = {
      utilityControllerInitialize: vi.fn(() => of({ data: { reference: 'ref-123' } })),
    };
    toast = { show: vi.fn() };
    paystackOpen = vi.fn();
    paystackSetup = vi.fn(() => ({ openIframe: paystackOpen }));
    (globalThis as any).PaystackPop = { setup: paystackSetup };

    await TestBed.configureTestingModule({
      imports: [TopupModalComponent],
      providers: [
        provideMockStore(),
        { provide: UtilityService, useValue: utilityApi },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose quick amounts without any entered amount', () => {
    expect(component.presets).toEqual([1_000, 2_000, 5_000, 10_000, 20_000, 50_000]);
    expect(component.selectedPreset()).toBeNull();
    expect(component.finalAmount).toBe(0);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.preset-btn');
    expect(buttons.length).toBe(6);
  });

  it('should select a preset and clear the custom amount', () => {
    component.customAmount = '1234';
    component.selectPreset(5_000);
    expect(component.selectedPreset()).toBe(5_000);
    expect(component.customAmount).toBe('');
    expect(component.finalAmount).toBe(5_000);
    expect(component.isValid).toBe(true);
  });

  it('should clear the preset when a custom amount is typed', () => {
    component.selectPreset(2_000);
    component.customAmount = '7500';
    component.onCustomInput();
    expect(component.selectedPreset()).toBeNull();
    expect(component.finalAmount).toBe(7_500);
  });

  it('should reject amounts below the ₦100 minimum', () => {
    component.customAmount = '50';
    component.onCustomInput();
    expect(component.isValid).toBe(false);
  });

  it('should initialize payment in kobo via the utility API', () => {
    component.userEmail = 'ada@example.com';
    component.selectPreset(5_000);
    component.initiatePayment();
    expect(utilityApi.utilityControllerInitialize).toHaveBeenCalledWith({
      email: 'ada@example.com',
      trendors_id: '',
      amount: 500_000,
    });
    expect(paystackSetup).toHaveBeenCalled();
    expect(paystackOpen).toHaveBeenCalled();
  });

  it('should move to confirmation once paystack reports success', () => {
    component.user = { trendors_id: 'trend-1' } as any;
    component.selectPreset(5_000);

    component.initiatePayment();
    paystackSetup.mock.calls[0][0].onSuccess({ reference: 'ref-123' });

    expect(component.awaitingConfirmation()).toBe(true);
    expect(component.successMsg()).toBe('');
    expect(component.isProcessing()).toBe(false);
  });

  it('should show success status and auto-close after the user confirms completion', async () => {
    component.user = { trendors_id: 'trend-1' } as any;
    component.selectPreset(5_000);
    let emitted: any = null;
    let closed = false;
    component.topupSuccess.subscribe((v) => (emitted = v));
    component.closed.subscribe(() => (closed = true));

    component.initiatePayment();
    paystackSetup.mock.calls[0][0].onSuccess({ reference: 'ref-123' });
    component.confirmCompletion();

    expect(component.awaitingConfirmation()).toBe(false);
    expect(component.successMsg()).toContain('Payment successful');
    expect(toast.show).toHaveBeenCalledWith('Payment successful.', 'success');
    expect(emitted?.reference).toBe('ref-123');
    expect(closed).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.success-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.btn-pay')?.textContent).toContain('Completed');
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(1500);
    expect(closed).toBe(true);
    vi.useRealTimers();
  });

  it('should require a reference before confirming completion', () => {
    component.confirmCompletion();
    expect(component.errorMsg()).toContain('Missing payment reference');
    expect(component.successMsg()).toBe('');
  });
});
