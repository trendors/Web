import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EscrowPanel } from './escrow-panel';
import { EscrowService, EscrowView } from '../../core/services/escrow/escrow.service';
import { ToastService } from '../toast/toast.service';

const escrow = (extra: Partial<EscrowView> = {}): EscrowView => ({
  id: 9, amount: 50000, released: 0, platform_fee: 0, refunded: 0, held: 50000,
  currency: 'NGN', status: 'held', dispute_reason: null, disputed_by: null, ...extra,
});

describe('EscrowPanel', () => {
  let fixture: ComponentFixture<EscrowPanel>;
  let api: { get: ReturnType<typeof vi.fn>; fund: ReturnType<typeof vi.fn>; dispute: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };

  async function setup(current: EscrowView | null, inputs: Record<string, unknown> = {}) {
    api = { get: vi.fn(() => of(current)), fund: vi.fn(async () => 'funded'), dispute: vi.fn(async () => ({})) };
    toast = { show: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [EscrowPanel],
      providers: [
        { provide: EscrowService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EscrowPanel);
    fixture.componentRef.setInput('assignmentId', 5);
    fixture.componentRef.setInput('feeAgreed', 50000);
    fixture.componentRef.setInput('assignmentStatus', 'contracted');
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('asks the brand to fund an unfunded contracted assignment', async () => {
    const el = await setup(null);
    expect(el.textContent).toContain('Needs funding');
    expect(el.textContent).toContain('Fund ₦50,000');
  });

  it('tells the influencer the brand has not funded yet, with no fund button', async () => {
    const el = await setup(null, { viewer: 'influencer' });
    expect(el.textContent).toContain("hasn't secured");
    expect(el.querySelector('.btn--primary')).toBeNull();
  });

  it('shows nothing before a deal exists', async () => {
    const el = await setup(null, { assignmentStatus: 'invited' });
    expect(el.querySelector('.escrow')).toBeNull();
  });

  it('funding calls the service and refreshes', async () => {
    const el = await setup(null);
    (el.querySelector('.btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(api.fund).toHaveBeenCalledWith(5, 50000);
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('secured'), 'success');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('a cancelled card payment does not announce success or emit a change', async () => {
    const el = await setup(null);
    api.fund.mockResolvedValue('cancelled');
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    (el.querySelector('.btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('cancelled'), 'info');
    expect(changed).not.toHaveBeenCalled();
  });

  it('shows the money held and paid out', async () => {
    const el = await setup(escrow({ released: 20000, held: 30000, status: 'partially_released' }));
    expect(el.textContent).toContain('Partly paid out');
    expect(el.textContent).toContain('₦30,000');
    expect(el.textContent).toContain('₦20,000');
  });

  it('opens a dispute with a reason', async () => {
    const el = await setup(escrow());
    (el.querySelector('.link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const submit = el.querySelector('.btn--danger') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    const box = el.querySelector('textarea') as HTMLTextAreaElement;
    box.value = 'Never delivered';
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('.btn--danger') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(api.dispute).toHaveBeenCalledWith(5, 'Never delivered');
  });

  it('a disputed escrow shows the freeze and no further dispute option', async () => {
    const el = await setup(escrow({ status: 'disputed', disputed_by: 'influencer', dispute_reason: 'Not paid' }), { viewer: 'brand' });
    expect(el.textContent).toContain('The influencer opened a dispute');
    expect(el.textContent).toContain('Not paid');
    expect(el.querySelector('.link-btn')).toBeNull();
  });

  it('asks the brand to top up when the fee grew after funding', async () => {
    const el = await setup(escrow(), { feeAgreed: 62000 });
    expect(el.textContent).toContain('Add ₦12,000');
    expect(el.textContent).toContain('Top up ₦12,000');
    (el.querySelector('.btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(api.fund).toHaveBeenCalledWith(5, 62000);
  });

  it('tells the influencer a top-up is pending, with no button', async () => {
    const el = await setup(escrow(), { feeAgreed: 62000, viewer: 'influencer' });
    expect(el.textContent).toContain('still needs to add ₦12,000');
    expect(el.querySelector('.btn--primary')).toBeNull();
  });

  it('reports whether it is funded', async () => {
    api = { get: vi.fn(() => of(escrow())), fund: vi.fn(), dispute: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [EscrowPanel],
      providers: [{ provide: EscrowService, useValue: api }, { provide: ToastService, useValue: { show: vi.fn() } }],
    }).compileComponents();
    fixture = TestBed.createComponent(EscrowPanel);
    const funded = vi.fn();
    fixture.componentInstance.funded.subscribe(funded);
    fixture.componentRef.setInput('assignmentId', 5);
    fixture.detectChanges();
    expect(funded).toHaveBeenCalledWith(true);
  });
});
