import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PostReview } from './post-review';
import { CampaignInfluencerPostService } from '../../core/api';
import { EscrowService } from '../../core/services/escrow/escrow.service';
import { ToastService } from '../toast/toast.service';

describe('PostReview', () => {
  let fixture: ComponentFixture<PostReview>;
  let posts: { campaignInfluencerPostControllerUpdate: ReturnType<typeof vi.fn> };
  let escrow: { requestChanges: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };

  async function setup(inputs: Record<string, unknown> = {}) {
    posts = { campaignInfluencerPostControllerUpdate: vi.fn(() => of({})) };
    escrow = { requestChanges: vi.fn(async () => ({})) };
    toast = { show: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PostReview],
      providers: [
        { provide: CampaignInfluencerPostService, useValue: posts },
        { provide: EscrowService, useValue: escrow },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PostReview);
    const all = { postId: 7, status: 'Submitted', paymentStatus: 'pending', payout: 2500, escrowFunded: true, ...inputs };
    for (const [k, v] of Object.entries(all)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const click = (el: HTMLElement, selector: string, index = 0) => {
    (el.querySelectorAll(selector)[index] as HTMLButtonElement).click();
    fixture.detectChanges();
  };

  it('offers nothing for unreviewable posts', async () => {
    expect((await setup({ status: 'Todo' })).querySelector('.review')).toBeNull();
  });

  it('offers nothing once paid', async () => {
    expect((await setup({ paymentStatus: 'paid' })).querySelector('.review')).toBeNull();
  });

  it('labels the approval as a payment when escrow is funded', async () => {
    expect((await setup()).textContent).toContain('Approve & pay');
  });

  it('asks before paying, then approves', async () => {
    const el = await setup();
    click(el, '.btn--primary');
    expect(el.textContent).toContain('pay ₦2,500 from escrow');
    expect(posts.campaignInfluencerPostControllerUpdate).not.toHaveBeenCalled();
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    click(el, '.btn--primary');
    await fixture.whenStable();
    expect(posts.campaignInfluencerPostControllerUpdate).toHaveBeenCalledWith(7, { status: 'approved' });
    expect(toast.show).toHaveBeenCalledWith('Approved and paid out.', 'success');
    expect(changed).toHaveBeenCalled();
  });

  it("shows the server's reason when approval is refused", async () => {
    const el = await setup();
    posts.campaignInfluencerPostControllerUpdate.mockReturnValue(throwError(() => ({ error: { message: 'This escrow is in dispute.' } })));
    click(el, '.btn--primary');
    click(el, '.btn--primary');
    await fixture.whenStable();
    expect(toast.show).toHaveBeenCalledWith('This escrow is in dispute.', 'error', 6000);
  });

  it('sends work back only with a note', async () => {
    const el = await setup();
    click(el, '.btn', 1);
    expect((el.querySelector('.btn--primary') as HTMLButtonElement).disabled).toBe(true);
    const box = el.querySelector('textarea') as HTMLTextAreaElement;
    box.value = 'Logo is cut off';
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    click(el, '.btn--primary');
    await fixture.whenStable();
    expect(escrow.requestChanges).toHaveBeenCalledWith(7, 'Logo is cut off');
  });
});
