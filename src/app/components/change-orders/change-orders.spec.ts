import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ChangeOrders } from './change-orders';
import { ChangeOrder, ChangeOrderService } from '../../core/services/escrow/change-order.service';
import { ToastService } from '../toast/toast.service';

const order = (extra: Partial<ChangeOrder> = {}): ChangeOrder => ({
  id: 8, round: 2, proposed_by: 'brand', status: 'proposed', message: 'Two more reels please',
  lines: [{ content_type: 'reel', platform: 'tiktok', quantity: 2, rate: 3000 }], total: 6000, ...extra,
});

describe('ChangeOrders', () => {
  let fixture: ComponentFixture<ChangeOrders>;
  let api: { open: ReturnType<typeof vi.fn>; propose: ReturnType<typeof vi.fn>; respond: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };

  async function setup(orders: ChangeOrder[], inputs: Record<string, unknown> = {}) {
    api = { open: vi.fn(() => of(orders)), propose: vi.fn(async () => ({})), respond: vi.fn(async () => ({})) };
    toast = { show: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ChangeOrders],
      providers: [{ provide: ChangeOrderService, useValue: api }, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    fixture = TestBed.createComponent(ChangeOrders);
    fixture.componentRef.setInput('assignmentId', 5);
    fixture.componentRef.setInput('assignmentStatus', 'active');
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('does not apply before a deal is signed', async () => {
    const el = await setup([], { assignmentStatus: 'invited' });
    expect(el.querySelector('.co')).toBeNull();
    expect(api.open).not.toHaveBeenCalled();
  });

  it('lets the other side accept or decline a proposal', async () => {
    const el = await setup([order()], { viewer: 'influencer' });
    expect(el.textContent).toContain('The brand proposed');
    expect(el.textContent).toContain('₦6,000');
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    (el.querySelector('.btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(api.respond).toHaveBeenCalledWith(8, 'accepted');
    expect(changed).toHaveBeenCalled();
  });

  it('the proposer can only wait', async () => {
    const el = await setup([order()], { viewer: 'brand' });
    expect(el.textContent).toContain('You proposed');
    expect(el.textContent).toContain('Waiting for the other side');
    expect(el.querySelector('.btn--primary')).toBeNull();
  });

  it('proposes extra work with a priced line', async () => {
    const el = await setup([]);
    (el.querySelector('.link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const send = () => el.querySelector('.btn--primary') as HTMLButtonElement;
    expect(send().disabled).toBe(false); // default line: 1 × video, ₦0
    const rate = el.querySelector('input[aria-label="Rate each (₦)"]') as HTMLInputElement;
    rate.value = '2500';
    rate.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.textContent).toContain('₦2,500');
    send().click();
    await fixture.whenStable();
    expect(api.propose).toHaveBeenCalledWith(
      5,
      [expect.objectContaining({ content_type: 'video', quantity: 1, rate: 2500 })],
      '',
    );
  });

  it('other work needs a description', async () => {
    const el = await setup([]);
    (el.querySelector('.link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    const type = el.querySelector('select') as HTMLSelectElement;
    type.value = 'other';
    type.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect((el.querySelector('.btn--primary') as HTMLButtonElement).disabled).toBe(true);
    const what = el.querySelector('input[aria-label="Work description"]') as HTMLInputElement;
    what.value = 'Attend the launch';
    what.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((el.querySelector('.btn--primary') as HTMLButtonElement).disabled).toBe(false);
  });
});
