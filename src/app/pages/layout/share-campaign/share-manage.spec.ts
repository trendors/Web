import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { ShareManage } from './share-manage';
import { ShareCampaignApiService } from '../../../core/services/share-campaign/share-campaign.service';
import { ToastService } from '../../../components/toast/toast.service';
import { ShareOverview } from '../../../core/models/share-campaign/share-campaign.model';

const overview = (over: Partial<ShareOverview> = {}): ShareOverview => ({
  payPerShare: 100, pool: 10000, closed: false, settled: false,
  counts: { started: 1, verified: 2, paid: 3, released: 1, expired: 1 },
  paid: 300, onHold: 200, remaining: 9000,
  shares: [
    { id: 1, creator: 'ada', state: 'paid', postUrl: 'https://x.com/ada/status/1', pay: 100, holdUntil: null, paidAt: '2026-11-20T10:00:00Z', reason: null },
    { id: 2, creator: 'bayo', state: 'verified', postUrl: 'https://x.com/bayo/status/2', pay: 100, holdUntil: '2026-11-21T10:00:00Z', paidAt: null, reason: null },
    { id: 3, creator: 'chi', state: 'released', postUrl: null, pay: 100, holdUntil: null, paidAt: null, reason: 'The post was no longer live when the hold ended.' },
  ],
  ...over,
});

describe('ShareManage', () => {
  let fixture: ComponentFixture<ShareManage>;
  let c: ShareManage;
  let api: { overview: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };

  async function open(o: ShareOverview | Error = overview()) {
    api.overview.mockImplementation(async () => { if (o instanceof Error) throw o; return o; });
    fixture = TestBed.createComponent(ShareManage);
    c = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(c.loading()).toBe(false));
    fixture.detectChanges();
  }
  const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  beforeEach(async () => {
    api = { overview: vi.fn(), close: vi.fn() };
    toast = { show: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ShareManage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '50' } } } },
        { provide: ShareCampaignApiService, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  it('shows the pay, the pool and how many shares are in each stage', async () => {
    await open();
    expect(api.overview).toHaveBeenCalledWith(50);
    expect(text()).toContain('₦100 per verified share');
    expect(text()).toContain('₦10,000 for creators');
    expect(text()).toContain('Running');
    for (const [label, n] of [['Waiting for a post', '1'], ['On hold', '2'], ['Paid', '3'], ['Not paid', '2']]) expect(text()).toContain(`${label}${n}`);
  });

  it('shows the money: paid, on hold and left', async () => {
    await open();
    expect(text()).toContain('Paid to creators₦300');
    expect(text()).toContain('₦200');
    expect(text()).toContain('Left to give out ₦9,000');
  });

  it('lists each creator with their stage, the post, and why a share was not paid', async () => {
    await open();
    expect(text()).toContain('ada');
    expect(text()).toContain('View post');
    expect(text()).toContain('paid after');
    expect(text()).toContain('The post was no longer live when the hold ended.');
  });

  it('says so when no one has shared yet', async () => {
    await open(overview({ shares: [], counts: { started: 0, verified: 0, paid: 0, released: 0, expired: 0 } }));
    expect(text()).toContain('No one has started sharing yet.');
  });

  describe('stopping the campaign', () => {
    it('asks first, then stops and shows the new state', async () => {
      await open();
      api.close.mockResolvedValue(overview({ closed: true }));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await c.stop();
      fixture.detectChanges();
      expect(api.close).toHaveBeenCalledWith(50);
      expect(toast.show).toHaveBeenCalledWith('Campaign stopped.', 'success');
      expect(text()).toContain('Stopped');
      expect(text()).toContain('Waiting for the last posts');
      expect(text()).not.toContain('Stop campaign');
    });

    it('does nothing when the brand changes their mind', async () => {
      await open();
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      await c.stop();
      expect(api.close).not.toHaveBeenCalled();
    });

    it('shows the server reason when it fails', async () => {
      await open();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      api.close.mockRejectedValue({ error: { message: 'Only the campaign owner can do this.' } });
      await c.stop();
      expect(toast.show).toHaveBeenCalledWith('Only the campaign owner can do this.', 'error');
      expect(c.busy()).toBe(false);
    });
  });

  it('says a closed, fully paid out campaign is settled', async () => {
    await open(overview({ closed: true, settled: true }));
    expect(text()).toContain('Settled');
    expect(text()).toContain('returned to your wallet');
  });

  it("shows the server's reason when the campaign cannot be opened, e.g. it is not theirs", async () => {
    await open(Object.assign(new Error('x'), { error: { message: 'Only the campaign owner can do this.' } }) as any);
    expect(text()).toContain('Only the campaign owner can do this.');
  });
});
