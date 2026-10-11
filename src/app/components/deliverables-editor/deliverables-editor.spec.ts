import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DeliverablesEditor } from './deliverables-editor';
import { CampaignDeliverableService } from '../../core/api';
import { ToastService } from '../toast/toast.service';

const list = (rows: any[]) => ({ data: { list: rows, outputs_total: 0 } });
const video = { id: 1, content_type: 'video', platform: 'facebook', quantity: 2, rate_per_post: '5000.00' };

describe('DeliverablesEditor', () => {
  let fixture: ComponentFixture<DeliverablesEditor>;
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let toast: { show: ReturnType<typeof vi.fn> };

  async function setup(rows: any[]) {
    api = {
      campaignDeliverableControllerFindByCampaign: vi.fn(() => of(list(rows))),
      campaignDeliverableControllerCreate: vi.fn(() => of({})),
      campaignDeliverableControllerUpdate: vi.fn(() => of({})),
      campaignDeliverableControllerRemove: vi.fn(() => of({})),
    };
    toast = { show: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [DeliverablesEditor],
      providers: [{ provide: CampaignDeliverableService, useValue: api }, { provide: ToastService, useValue: toast }],
    }).compileComponents();
    fixture = TestBed.createComponent(DeliverablesEditor);
    fixture.componentRef.setInput('campaignId', 3);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const click = async (el: HTMLElement, selector: string, index = 0) => {
    (el.querySelectorAll(selector)[index] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const type = (el: HTMLElement, label: string, value: string) => {
    const input = el.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('tells the brand when there are none, so the repair path is obvious', async () => {
    const el = await setup([]);
    expect(el.textContent).toContain("won't see an offer until you add some");
  });

  it('lists what is asked with the total per creator', async () => {
    const el = await setup([video, { id: 2, content_type: 'story', platform: 'instagram', quantity: 1, rate_per_post: 1000 }]);
    expect(el.textContent).toContain('2 × facebook video');
    expect(el.textContent).toContain('₦11,000 per creator');
  });

  it('adds a deliverable for this campaign and reloads', async () => {
    const el = await setup([]);
    await click(el, '.link-btn');
    type(el, 'Rate each (₦)', '2500');
    await click(el, '.btn--primary');
    expect(api['campaignDeliverableControllerCreate']).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: 3, content_type: 'video', platform: 'instagram', quantity: 1, rate_per_post: 2500 }),
    );
    expect(toast.show).toHaveBeenCalledWith('Deliverable added.', 'success');
    expect(api['campaignDeliverableControllerFindByCampaign']).toHaveBeenCalledTimes(2);
  });

  it('edits quantity and rate', async () => {
    const el = await setup([video]);
    await click(el, '.link-btn'); // Edit
    type(el, 'Quantity', '4');
    await click(el, '.btn--primary');
    expect(api['campaignDeliverableControllerUpdate']).toHaveBeenCalledWith(1, { quantity: 4, rate_per_post: 5000 });
  });

  it('removes a deliverable', async () => {
    const el = await setup([video]);
    await click(el, '.link-btn--danger');
    expect(api['campaignDeliverableControllerRemove']).toHaveBeenCalledWith(1);
  });

  it("shows the server's reason when it refuses (e.g. a duplicate)", async () => {
    const el = await setup([video]);
    api['campaignDeliverableControllerCreate'].mockReturnValue(
      throwError(() => ({ error: { message: 'These outputs already exist for this campaign (same content type + platform).' } })),
    );
    await click(el, '.link-btn:not(.link-btn--danger):last-of-type');
    await click(el, '.btn--primary');
    expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('already exist'), 'error', 6000);
  });
});
