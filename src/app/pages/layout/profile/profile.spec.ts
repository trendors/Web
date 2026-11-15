import { provideTestDefaults } from '../../../core/testing/test-providers';
import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Profile } from './profile';
import { WalletService } from '../../../core/services/wallet/wallet.service';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';

const user = (over: Record<string, unknown> = {}) => ({ id: 25, trendors_id: 'TR-25', email: 'ada@mail.com', user_name: 'ada', ...over });
const saved = { success: true, bankName: 'United Bank For Africa', accountNumber: '0123456952', accountName: 'Sunday Sayil', bankCode: '033' };

describe('Profile: the wallet tab', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let store: MockStore;
  let wallet: { getAccountDetails: ReturnType<typeof vi.fn>; addBankAccount: ReturnType<typeof vi.fn>; fetchBanks: ReturnType<typeof vi.fn> };

  async function open(u: ReturnType<typeof user>, details: unknown = saved) {
    wallet.getAccountDetails.mockImplementation(() => (details instanceof Error ? throwError(() => details) : of(details)));
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        ...provideTestDefaults().filter((p) => p !== undefined),
        { provide: WalletService, useValue: wallet },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCurrentUser, u as any);
    store.refreshState();
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    component.activeTab = 'wallet';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: RegExp) => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => label.test(b.textContent ?? '')) as HTMLButtonElement | undefined;

  beforeEach(() => {
    wallet = { getAccountDetails: vi.fn(), addBankAccount: vi.fn(), fetchBanks: vi.fn(() => of([])) };
  });

  it('should create', async () => {
    await open(user());
    expect(component).toBeTruthy();
  });

  describe('with a bank account saved', () => {
    it('shows the bank, a masked account number and the account name', async () => {
      await open(user({ paystackRecipientCode: 'RCP_1' }));
      expect(wallet.getAccountDetails).toHaveBeenCalledWith('RCP_1');
      expect(text()).toContain('Payouts are sent to this bank account.');
      expect(text()).toContain('United Bank For Africa');
      expect(text()).toContain('••••••6952');
      expect(text()).toContain('Sunday Sayil');
      expect(text()).not.toContain('0123456952'); // the full number is never shown
    });

    it('shows the details, not the form, until the user chooses to change them', async () => {
      await open(user({ paystackRecipientCode: 'RCP_1' }));
      expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
      expect(button(/Change account/)).toBeDefined();
      expect(button(/Save withdrawal account/)).toBeUndefined();
    });

    it('opens the form, filled in, when they change it, and goes back on Cancel', async () => {
      await open(user({ paystackRecipientCode: 'RCP_1' }));
      button(/Change account/)!.click();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('form')).not.toBeNull();
      expect(component.bankForm.value.accountNumber).toBe('0123456952');
      expect((fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#bank')!.value).toBe('United Bank For Africa');
      component.bankForm.patchValue({ accountNumber: '9999999999' }); // an unsaved edit
      button(/Cancel/)!.click();
      fixture.detectChanges();
      expect(text()).toContain('••••••6952');
      expect(component.bankForm.value.accountNumber).toBe('0123456952'); // the edit was dropped
    });

    it('shows the new account straight after it is saved', async () => {
      await open(user({ paystackRecipientCode: 'RCP_1' }));
      wallet.addBankAccount.mockReturnValue(of({ success: true }));
      button(/Change account/)!.click();
      component.bankForm.patchValue({ accountNumber: '1112223333', accountName: 'Ada Obi' });
      component.bankSearchCtrl.setValue('GTBank', { emitEvent: false });
      component.onSaveBankAccount();
      fixture.detectChanges();
      expect(wallet.addBankAccount).toHaveBeenCalledWith(expect.objectContaining({ accountNumber: '1112223333', bankCode: '033', accountName: 'Ada Obi' }));
      expect(text()).toContain('GTBank');
      expect(text()).toContain('••••••3333');
      expect(text()).toContain('Ada Obi');
      expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
    });

    it('stays on the form with the old details when saving fails', async () => {
      await open(user({ paystackRecipientCode: 'RCP_1' }));
      wallet.addBankAccount.mockReturnValue(of({ success: false }));
      button(/Change account/)!.click();
      component.onSaveBankAccount();
      fixture.detectChanges();
      expect(component.editingBank()).toBe(true);
      expect(component.savedBank()?.accountName).toBe('Sunday Sayil');
    });
  });

  describe('with no bank account saved', () => {
    it('shows the form, asking for the account, and asks the server nothing', async () => {
      await open(user());
      expect(wallet.getAccountDetails).not.toHaveBeenCalled();
      expect((fixture.nativeElement as HTMLElement).querySelector('form')).not.toBeNull();
      expect(text()).toContain('Add the bank account your payouts are sent to.');
      expect(text()).not.toContain('Change account');
      expect(button(/Cancel/)).toBeUndefined();
    });
  });

  it('falls back to the form when the saved account cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await open(user({ paystackRecipientCode: 'RCP_1' }), new Error('offline'));
    expect(component.savedBank()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).not.toBeNull();
  });

  it('finds the account when the full profile arrives after the first update', async () => {
    await open(user()); // the first update has no recipient code
    expect(wallet.getAccountDetails).not.toHaveBeenCalled();
    store.overrideSelector(selectCurrentUser, user({ paystackRecipientCode: 'RCP_9' }) as any);
    store.refreshState();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(wallet.getAccountDetails).toHaveBeenCalledWith('RCP_9');
    expect(text()).toContain('••••••6952');
  });

  it('does not fetch the same account again on later updates', async () => {
    await open(user({ paystackRecipientCode: 'RCP_1' }));
    store.overrideSelector(selectCurrentUser, user({ paystackRecipientCode: 'RCP_1', first_name: 'Ada' }) as any);
    store.refreshState();
    expect(wallet.getAccountDetails).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['0123456952', '••••••6952'],
    ['1234', '1234'],
    ['', ''],
    [null, ''],
  ])('masks %j as %j', async (input, expected) => {
    await open(user());
    expect(component.maskAccount(input as any)).toBe(expected);
  });
});
