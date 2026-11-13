import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { PackageCampaignService } from './package-campaign.service';
import { CampaignCheckoutService } from '../payment/campaign-checkout.service';

describe('PackageCampaignService', () => {
  let svc: PackageCampaignService;
  let http: HttpTestingController;
  let checkout: { openCard: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    checkout = { openCard: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: CampaignCheckoutService, useValue: checkout }],
    });
    svc = TestBed.inject(PackageCampaignService);
    svc.pollEveryMs = 1;
    svc.confirmTimeoutMs = 50;
    http = TestBed.inject(HttpTestingController);
  });

  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

  it('offers only the platforms creators can connect, lower-cased', async () => {
    const p = svc.connectablePlatforms();
    http.expectOne((r) => r.url.endsWith('/settings/public')).flush({ data: { connectable_platforms: ['Twitter', 'instagram'] } });
    await expect(p).resolves.toEqual(['twitter', 'instagram']);
  });

  it('falls back to X when the setting is missing or cannot be read', async () => {
    const p1 = svc.connectablePlatforms();
    http.expectOne((r) => r.url.endsWith('/settings/public')).flush({ data: {} });
    await expect(p1).resolves.toEqual(['twitter']);
    const p2 = svc.connectablePlatforms();
    http.expectOne((r) => r.url.endsWith('/settings/public')).flush('boom', { status: 500, statusText: 'err' });
    await expect(p2).resolves.toEqual(['twitter']);
  });

  it('unwraps { data } from the API', async () => {
    const p = svc.packages();
    http.expectOne((r) => r.url.endsWith('/campaign-plan/packages')).flush({ error: false, data: [{ key: 'basic' }] });
    await expect(p).resolves.toEqual([{ key: 'basic' }]);
  });

  it('is paid straight away when the wallet covers it, with no card popup', async () => {
    const p = svc.pay(7);
    await flush();
    http.expectOne((r) => r.url.endsWith('/campaign-plan/7/checkout')).flush({ data: { status: 'paid', alreadyPaid: false, total: 1000 } });
    await expect(p).resolves.toBe('paid');
    expect(checkout.openCard).not.toHaveBeenCalled();
  });

  it('charges nothing and reports "cancelled" when the card popup is closed', async () => {
    checkout.openCard.mockResolvedValue('closed');
    const p = svc.pay(7);
    await flush();
    http.expectOne((r) => r.url.endsWith('/campaign-plan/7/checkout')).flush({ data: { status: 'payment_required', amount: 500, reference: 'plan-7-x', email: 'a@b.c', total: 1000, balance: 500, accessCode: null, authorizationUrl: null } });
    await expect(p).resolves.toBe('cancelled');
  });

  it('does not trust the card popup: only a campaign seen active counts as paid', async () => {
    checkout.openCard.mockResolvedValue('submitted');
    const p = svc.pay(7);
    await flush();
    http.expectOne((r) => r.url.endsWith('/campaign-plan/7/checkout')).flush({ data: { status: 'payment_required', amount: 500, reference: 'plan-7-x', email: 'a@b.c', total: 1000, balance: 500, accessCode: null, authorizationUrl: null } });
    // The server still says awaiting payment until the webhook lands, then active.
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 3));
      const open = http.match((r) => r.url.endsWith('/campaign-plan/7/review'));
      if (open.length) { open[0].flush({ data: { lifecycle: i < 1 ? 'awaiting_payment' : 'active' } }); }
    }
    await expect(p).resolves.toBe('paid');
  });

  it('reports "pending" when the payment is not confirmed in time', async () => {
    checkout.openCard.mockResolvedValue('submitted');
    const p = svc.pay(7);
    await flush();
    http.expectOne((r) => r.url.endsWith('/campaign-plan/7/checkout')).flush({ data: { status: 'payment_required', amount: 500, reference: 'plan-7-x', email: 'a@b.c', total: 1000, balance: 500, accessCode: null, authorizationUrl: null } });
    const stop = Date.now() + 200;
    while (Date.now() < stop) {
      await new Promise((r) => setTimeout(r, 3));
      http.match((r) => r.url.endsWith('/campaign-plan/7/review')).forEach((q) => q.flush({ data: { lifecycle: 'awaiting_payment' } }));
    }
    await expect(p).resolves.toBe('pending');
  });
});
