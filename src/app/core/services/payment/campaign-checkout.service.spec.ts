import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { CampaignService } from '../../api';
import { FakeSocket } from '../../testing/fake-socket';
import { RealtimeEvent, SocketService } from '../../../socket.service';
import { CampaignCheckoutService } from './campaign-checkout.service';

describe('CampaignCheckoutService', () => {
  let service: CampaignCheckoutService;
  let api: { campaignControllerCheckout: ReturnType<typeof vi.fn>; campaignControllerPaymentStatus: ReturnType<typeof vi.fn> };
  let fake: FakeSocket;
  let paystack: { setup: ReturnType<typeof vi.fn>; opts?: any };

  const cardCheckout = {
    data: {
      status: 'payment_required',
      budget: 60000,
      balance: 25000,
      amount: 35000,
      reference: 'cmp-7-abc',
      accessCode: 'AC',
      authorizationUrl: null,
      email: 'brand@x.com',
    },
  };

  beforeEach(() => {
    api = {
      campaignControllerCheckout: vi.fn(() => of(cardCheckout)),
      campaignControllerPaymentStatus: vi.fn(() => of({ data: { paymentStatus: 'awaiting_payment' } })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CampaignService, useValue: api }] });
    const socket = TestBed.inject(SocketService);
    fake = new FakeSocket();
    (socket as any).createSocket = () => fake;
    socket.connectRealtime('tok');
    service = TestBed.inject(CampaignCheckoutService);
    service.pollEveryMs = 50;
    service.confirmTimeoutMs = 400;

    paystack = {
      setup: vi.fn((opts: any) => {
        paystack.opts = opts;
        return { openIframe: vi.fn() };
      }),
    };
    (globalThis as any).PaystackPop = paystack;
  });

  afterEach(() => {
    delete (globalThis as any).PaystackPop;
  });

  it('is done in one step when the wallet covers it (no card window)', async () => {
    api.campaignControllerCheckout.mockReturnValueOnce(of({ data: { status: 'paid', alreadyPaid: false, budget: 60000 } }));
    const steps: string[] = [];
    await expect(service.pay(7, (s) => steps.push(s))).resolves.toBe('paid');
    expect(paystack.setup).not.toHaveBeenCalled();
    expect(steps).toEqual(['starting']);
  });

  it('opens Paystack for exactly the server-initialized shortfall', async () => {
    const pending = service.pay(7);
    await vi.waitFor(() => expect(paystack.setup).toHaveBeenCalled());
    expect(paystack.opts).toMatchObject({ amount: 3500000, ref: 'cmp-7-abc', email: 'brand@x.com', currency: 'NGN' });
    paystack.opts.onClose();
    await expect(pending).resolves.toBe('cancelled');
  });

  it('after the card, waits for the server: the live push confirms it', async () => {
    const steps: string[] = [];
    const pending = service.pay(7, (s) => steps.push(s));
    await vi.waitFor(() => expect(paystack.setup).toHaveBeenCalled());
    paystack.opts.callback({ reference: 'cmp-7-abc' });
    await vi.waitFor(() => expect(steps).toContain('confirming'));
    fake.serverEmit(RealtimeEvent.CampaignUpdated, { campaignId: 99, payment: 'paid' }); // someone else's campaign
    fake.serverEmit(RealtimeEvent.CampaignUpdated, { campaignId: 7, payment: 'paid' });
    await expect(pending).resolves.toBe('paid');
    expect(steps).toEqual(['starting', 'card', 'confirming']);
  });

  it('falls back to polling when the push never comes', async () => {
    api.campaignControllerPaymentStatus
      .mockReturnValueOnce(of({ data: { paymentStatus: 'awaiting_payment' } }))
      .mockReturnValue(of({ data: { paymentStatus: 'paid' } }));
    const pending = service.pay(7);
    await vi.waitFor(() => expect(paystack.setup).toHaveBeenCalled());
    paystack.opts.callback({});
    await expect(pending).resolves.toBe('paid');
  });

  it('reports pending (not failure) if confirmation takes too long', async () => {
    const pending = service.pay(7);
    await vi.waitFor(() => expect(paystack.setup).toHaveBeenCalled());
    paystack.opts.callback({});
    await expect(pending).resolves.toBe('pending');
  });

  it('never treats the popup alone as proof of payment', async () => {
    const pending = service.pay(7);
    await vi.waitFor(() => expect(paystack.setup).toHaveBeenCalled());
    paystack.opts.callback({ status: 'success' });
    await expect(pending).resolves.toBe('pending'); // no server confirmation arrived
  });

  it('fails clearly when the Paystack script is missing', async () => {
    delete (globalThis as any).PaystackPop;
    await expect(service.pay(7)).rejects.toThrow('payment window could not load');
  });
});
