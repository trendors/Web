import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Negotiation } from './negotiation';
import { CampaignDeliverableService, CampaignOfferService } from '../../core/api';

describe('Negotiation', () => {
  let component: Negotiation;
  let fixture: ComponentFixture<Negotiation>;

  const deliverablesApi = {
    campaignDeliverableControllerFindByCampaign: vi.fn((_campaignId: number) =>
      of({
        message: 'Deliverables fetched',
        error: false,
        data: [
          { id: 1, content_type: 'reel', platform: 'instagram', quantity: 2, rate_per_post: 40000 },
          { id: 2, content_type: 'story', platform: 'tiktok', quantity: 1, rate_per_post: 20000 },
        ],
      })
    ),
  };

  const offerApi = {
    campaignOfferControllerThread: vi.fn(() => of({ message: 'Thread', error: false, data: [] })),
    campaignOfferControllerAgreed: vi.fn((_assignmentId: number) =>
      of({
        message: 'Agreed offer',
        error: false,
        data: {
          id: 901,
          status: 'accepted',
          lines: [
            { id: 11, content_type: 'reel', platform: 'instagram', quantity: 1, rate: 50000 },
            { id: 12, content_type: 'story', platform: 'tiktok', quantity: 2, rate: 15000 },
          ],
        },
      })
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Negotiation],
      providers: [
        { provide: CampaignDeliverableService, useValue: deliverablesApi },
        { provide: CampaignOfferService, useValue: offerApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Negotiation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not fetch without a campaign id', () => {
    expect(deliverablesApi.campaignDeliverableControllerFindByCampaign).not.toHaveBeenCalled();
    expect(component.deliverables).toEqual([]);
  });

  it('should fetch deliverables by campaign id as the current offer', () => {
    component.campaignId = 7;
    component.ngOnChanges({ campaignId: { currentValue: 7 } } as any);
    expect(deliverablesApi.campaignDeliverableControllerFindByCampaign).toHaveBeenCalledWith(
      7,
      'body',
      false,
      { transferCache: false }
    );
    expect(component.deliverables).toEqual([
      { contentType: 'reel', platform: 'instagram', quantity: 2, ratePerPost: 40000 },
      { contentType: 'story', platform: 'tiktok', quantity: 1, ratePerPost: 20000 },
    ]);
    expect(component.currentCount).toBe(3);
    expect(component.currentTotal).toBe(2 * 40000 + 20000);
    expect(component.displayAmount).toBe(2 * 40000 + 20000);
    expect(component.displayCount).toBe(3);
  });

  it('should fall back to input items when no deliverables load', () => {
    component.offerItems = [{ contentType: 'post', platform: 'X', quantity: 1, ratePerPost: 5000 }];
    component.offerAmount = 5000;
    component.contentsCount = 1;
    expect(component.currentItems).toEqual(component.offerItems);
    expect(component.displayAmount).toBe(5000);
    expect(component.displayCount).toBe(1);
  });

  it('should fetch agreed deliverables by assignment id as the current offer', () => {
    component.campaignId = 7;
    component.campaignInfluencerId = 205;
    component.ngOnChanges(
      { campaignId: { currentValue: 7 }, campaignInfluencerId: { currentValue: 205 } } as any
    );
    expect(offerApi.campaignOfferControllerAgreed).toHaveBeenCalledWith(
      205,
      'body',
      false,
      { transferCache: false }
    );
    expect(component.isAgreedOffer).toBe(true);
    expect(component.agreedItems).toEqual([
      { contentType: 'reel', platform: 'instagram', quantity: 1, ratePerPost: 50000 },
      { contentType: 'story', platform: 'tiktok', quantity: 2, ratePerPost: 15000 },
    ]);
    // Agreed lines win over campaign deliverables for the current offer.
    expect(component.currentTotal).toBe(50000 + 2 * 15000);
    expect(component.displayAmount).toBe(50000 + 2 * 15000);
    expect(component.displayCount).toBe(3);
  });
});

describe('Negotiation thread behaviour', () => {
  const round = (over: Record<string, any>) => ({
    id: 50,
    round: 1,
    proposed_by: 'brand',
    status: 'proposed',
    lines: [
      { content_type: 'reel', platform: 'instagram', quantity: 2, rate: 40000, title: 'reel on instagram x2', due_date: '2026-03-01' },
      { content_type: null, platform: null, title: 'Attend the shoot', description: 'Bring props', quantity: 1, rate: 3000 },
      { content_type: 'story', platform: 'tiktok', quantity: 1, rate: 20000, title: 'story on tiktok' },
    ],
    ...over,
  });

  function build(latest: Record<string, any>) {
    const offerApi = {
      campaignOfferControllerThread: vi.fn(() => of({ data: [latest] })),
      campaignOfferControllerAgreed: vi.fn(() => of({ data: null })),
      campaignOfferControllerCreate: vi.fn(() => of({ data: {} })),
      campaignOfferControllerRespond: vi.fn(() => of({ data: {} })),
    };
    TestBed.configureTestingModule({
      imports: [Negotiation],
      providers: [
        { provide: CampaignDeliverableService, useValue: { campaignDeliverableControllerFindByCampaign: vi.fn(() => of({ data: [] })) } },
        { provide: CampaignOfferService, useValue: offerApi },
      ],
    });
    const fixture = TestBed.createComponent(Negotiation);
    const component = fixture.componentInstance;
    component.viewMode = 'influencer';
    component.campaignInfluencerId = 205;
    component.ngOnInit();
    return { component, offerApi };
  }

  it('lets the other side respond only while the latest round is proposed', () => {
    const { component } = build(round({}));
    expect(component.isMyTurn).toBe(true);
    expect(component.isWaiting).toBe(false);
  });

  it.each(['accepted', 'declined', 'expired'])('closes the thread once the latest round is %s', (status) => {
    const { component } = build(round({ status }));
    expect(component.isMyTurn).toBe(false);
    expect(component.isWaiting).toBe(false);
    expect(component.closedMessage).toBeTruthy();
  });

  it('shows waiting (not actions) on your own open round', () => {
    const { component } = build(round({ proposed_by: 'influencer' }));
    expect(component.isMyTurn).toBe(false);
    expect(component.isWaiting).toBe(true);
  });

  it('labels chore lines by title instead of a content type', () => {
    const { component } = build(round({}));
    const [content, chore] = component.currentItems;
    expect(component.itemLabel(content)).toBe('2 × instagram reel');
    expect(component.itemLabel(chore)).toBe('Attend the shoot');
    expect(component.itemRateText(chore)).toBe('₦3,000');
  });

  it('counters one line and carries every other line over unchanged', () => {
    const { component, offerApi } = build(round({}));
    component.openCounter();
    component.selectCounterLine(2);
    component.counterCount = 3;
    component.counterAmount = 90000;
    component.submitCounter();

    const dto = (offerApi.campaignOfferControllerCreate.mock.calls as any[][])[0][0];
    expect(dto.lines).toHaveLength(3);
    // untouched content line keeps its own due date and no stale generated title
    expect(dto.lines[0]).toMatchObject({ content_type: 'reel', platform: 'instagram', quantity: 2, rate: 40000, due_date: '2026-03-01' });
    expect(dto.lines[0].title).toBeUndefined();
    // chore line stays a chore: title + description, no content type
    expect(dto.lines[1]).toMatchObject({ title: 'Attend the shoot', description: 'Bring props', quantity: 1, rate: 3000 });
    expect(dto.lines[1].content_type).toBeUndefined();
    // countered line changes
    expect(dto.lines[2]).toMatchObject({ content_type: 'story', platform: 'tiktok', quantity: 3, rate: 30000 });
  });

  it('rounds the per-unit rate to the cent and reports the real total', () => {
    const { component } = build(round({}));
    component.counterCount = 3;
    component.counterAmount = 10000;
    expect(component.costPerContent).toBe(3333.33);
    expect(component.counterTotalSent).toBe(9999.99);
  });

  it('asks for valid numbers instead of silently doing nothing', () => {
    const { component, offerApi } = build(round({}));
    component.openCounter();
    component.counterAmount = 0;
    component.submitCounter();
    expect(component.actionError).toContain('greater than zero');
    expect(offerApi.campaignOfferControllerCreate).not.toHaveBeenCalled();
  });

  it("surfaces the server's reason when responding fails", () => {
    const { component, offerApi } = build(round({}));
    offerApi.campaignOfferControllerRespond.mockReturnValueOnce(
      throwError(() => ({ message: 'Http failure response', error: { message: 'Offer is already accepted.' } })) as any,
    );
    component.accept();
    expect(component.actionError).toBe('Offer is already accepted.');
  });

  describe('initial terms (campaign deliverables, no round yet)', () => {
    function buildEmpty(viewMode: 'brand' | 'influencer') {
      const offerApi = {
        campaignOfferControllerThread: vi.fn(() => of({ data: [] })),
        campaignOfferControllerAgreed: vi.fn(() => of({ data: null })),
        campaignOfferControllerCreate: vi.fn(() => of({ data: {} })),
        campaignOfferControllerAcceptTerms: vi.fn(() => of({ data: {} })),
      };
      TestBed.configureTestingModule({
        imports: [Negotiation],
        providers: [
          {
            provide: CampaignDeliverableService,
            useValue: {
              campaignDeliverableControllerFindByCampaign: vi.fn(() =>
                of({ data: [{ id: 1, content_type: 'reel', platform: 'instagram', quantity: 2, rate_per_post: 40000 }] }),
              ),
            },
          },
          { provide: CampaignOfferService, useValue: offerApi },
        ],
      });
      const component = TestBed.createComponent(Negotiation).componentInstance;
      component.viewMode = viewMode;
      component.campaignId = 3;
      component.campaignInfluencerId = 205;
      component.ngOnInit();
      return { component, offerApi };
    }

    it('shows the campaign deliverables as the offer for the influencer to act on', () => {
      const { component } = buildEmpty('influencer');
      expect(component.isOfficialOffer).toBe(true);
      expect(component.isMyTurn).toBe(true);
      expect(component.displayAmount).toBe(80000);
    });

    it('accepting closes the deal through the accept-terms call, not a proposed round', () => {
      const { component, offerApi } = buildEmpty('influencer');
      component.accept();
      expect(offerApi.campaignOfferControllerAcceptTerms).toHaveBeenCalledWith(205);
      expect(offerApi.campaignOfferControllerCreate).not.toHaveBeenCalled();
      expect(component.actionNotice).toContain('deal is agreed');
      // and the thread + agreement are reloaded so the card reflects the deal
      expect(offerApi.campaignOfferControllerAgreed).toHaveBeenCalledTimes(2);
    });

    it("does not let the brand accept its own campaign's terms", () => {
      const { component, offerApi } = buildEmpty('brand');
      component.accept();
      expect(offerApi.campaignOfferControllerAcceptTerms).not.toHaveBeenCalled();
      expect(component.actionError).toContain('influencer accepts');
    });
  });

  describe('live updates', () => {
    it('refetches when its own assignment changes, ignores others', async () => {
      const { SocketService, RealtimeEvent } = await import('../../socket.service');
      const { FakeSocket } = await import('../../core/testing/fake-socket');
      const offerApi = {
        campaignOfferControllerThread: vi.fn(() => of({ data: [] })),
        campaignOfferControllerAgreed: vi.fn(() => of({ data: null })),
      };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [Negotiation],
        providers: [
          { provide: CampaignDeliverableService, useValue: { campaignDeliverableControllerFindByCampaign: vi.fn(() => of({ data: [] })) } },
          { provide: CampaignOfferService, useValue: offerApi },
        ],
      });
      const socket = TestBed.inject(SocketService);
      const fake = new FakeSocket();
      (socket as any).createSocket = () => fake;
      socket.connectRealtime('tok');

      vi.useFakeTimers();
      const fixture = TestBed.createComponent(Negotiation);
      fixture.componentInstance.campaignInfluencerId = 205;
      fixture.detectChanges(); // runs ngOnInit once
      offerApi.campaignOfferControllerThread.mockClear();

      fake.serverEmit(RealtimeEvent.NegotiationUpdated, { assignmentId: 999 });
      vi.advanceTimersByTime(300);

      expect(offerApi.campaignOfferControllerThread).not.toHaveBeenCalled();

      fake.serverEmit(RealtimeEvent.NegotiationUpdated, { assignmentId: 205 });
      vi.advanceTimersByTime(300);
      expect(offerApi.campaignOfferControllerThread).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
