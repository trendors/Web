import { provideTestDefaults } from '../../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';

import { Transaction } from './transaction';
import { selectAllTransactions, selectTransactionsLoading } from '../../../store/transactions/transaction.selector';

describe('Transaction', () => {
  let component: Transaction;
  let fixture: ComponentFixture<Transaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Transaction],
      providers: [
        ...provideTestDefaults(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Transaction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('status of each row', () => {
    function show(rows: unknown[]) {
      const store = TestBed.inject(MockStore);
      store.overrideSelector(selectTransactionsLoading, false);
      store.overrideSelector(selectAllTransactions, rows as any);
      store.refreshState();
      fixture.detectChanges();
      return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tx-row'));
    }
    const row = (over: Record<string, unknown>) => ({ id: 1, type: 'debit', amount: '3000.00', currency: 'NGN', createdAt: '2026-11-16T20:47:16Z', description: 'Withdrawal to your bank account', status: 'completed', ...over });

    it('marks a failed withdrawal as failed and strikes out its amount', () => {
      const [li] = show([row({ status: 'failed', description: 'Withdrawal failed. The money was returned to your wallet.' })]);
      expect(li.classList).toContain('failed');
      expect(li.querySelector('.tx-status')!.classList).toContain('failed');
      expect(li.querySelector('.tx-amount')!.classList).toContain('failed');
      expect(li.textContent).toContain('The money was returned to your wallet.');
    });

    it('marks a pending row as pending, not failed', () => {
      const [li] = show([row({ status: 'pending' })]);
      expect(li.querySelector('.tx-status')!.classList).toContain('pending');
      expect(li.querySelector('.tx-amount')!.classList).not.toContain('failed');
    });

    it('shows a completed row plainly', () => {
      const [li] = show([row({})]);
      expect(li.classList).not.toContain('failed');
      expect(li.querySelector('.tx-status')!.className).toBe('tx-status');
    });

    it('does not show a failed credit as money in', () => {
      const [li] = show([row({ type: 'credit', status: 'failed' })]);
      expect(li.querySelector('.tx-amount')!.classList).not.toContain('credit');
    });
  });
});
