import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CampaignInsightsPanel } from './campaign-insights';
import { CampaignInsights, CampaignInsightsService } from '../../core/services/campaign/campaign-insights.service';
import { SocketService } from '../../socket.service';

const totals = (extra: object = {}) => ({ posts: 2, views: 2500, likes: 240, comments: 25, shares: 15, engagement: 280, engagementRate: 0.112, ...extra });

const sample = (extra: Partial<CampaignInsights> = {}): CampaignInsights => ({
  campaignId: 1,
  name: 'Glow',
  status: 'active',
  schedule: { start: '2026-10-01', end: '2026-10-21', daysLeft: 9, timePct: 57 },
  creators: { invited: 1, applied: 0, contracted: 1, active: 1, completed: 0, declined: 1, total: 3 },
  delivery: { agreed: 3, delivered: 2, approved: 1, percent: 67, overdue: 1, awaitingReview: 1, pace: 'on_track' },
  performance: totals(),
  trend: [
    { date: '2026-10-09', views: 1000, engagement: 115 },
    { date: '2026-10-10', views: 1000, engagement: 115 },
    { date: '2026-10-11', views: 2500, engagement: 280 },
  ],
  byPlatform: [
    { key: 'instagram', ...totals({ posts: 1, views: 2000, engagement: 230, engagementRate: 0.115 }) },
    { key: 'facebook', ...totals({ posts: 1, views: 500, engagement: 50, engagementRate: 0.1 }) },
  ],
  byFormat: [{ key: 'reel', ...totals({ posts: 1, views: 2000 }) }],
  topCreators: [
    { assignmentId: 10, userId: 100, name: 'Ada', posts: 2, views: 2500, engagement: 280, engagementRate: 0.112, cost: 20000, costPer1kViews: 8000 },
    { assignmentId: 11, userId: 101, name: 'Bola', posts: 0, views: 0, engagement: 0, engagementRate: 0, cost: 0, costPer1kViews: null },
  ],
  topPosts: [{ postId: 1, title: 'Reel A', creator: 'Ada', platform: 'instagram', format: 'reel', views: 2000, engagement: 230, url: 'https://x/1' }],
  spend: { agreed: 30000, funded: 20000, held: 10000, paidOut: 10000, toFund: 10000, budget: 100000, deliveredCost: 20000, costPer1kViews: 8000, costPerEngagement: 71.43 },
  attention: { fundingDue: 1, disputes: 0, awaitingReview: 1, overdue: 1, quiet: 0 },
  ...extra,
});

describe('CampaignInsightsPanel', () => {
  let fixture: ComponentFixture<CampaignInsightsPanel>;
  let api: { get: ReturnType<typeof vi.fn> };
  let live: Subject<any>;

  async function setup(result: any = of(sample())) {
    api = { get: vi.fn(() => result) };
    live = new Subject();
    await TestBed.configureTestingModule({
      imports: [CampaignInsightsPanel],
      providers: [
        { provide: CampaignInsightsService, useValue: api },
        { provide: SocketService, useValue: { changes: () => live.asObservable() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CampaignInsightsPanel);
    fixture.componentRef.setInput('campaignId', 1);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }
  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');

  it('shows the headline figures', async () => {
    const el = await setup();
    const t = text(el);
    expect(t).toContain('2 / 3');
    expect(t).toContain('On track · 67% delivered, 57% of time used');
    expect(t).toContain('2.5K'); // views
    expect(t).toContain('11.2%'); // engagement rate
    expect(t).toContain('₦10,000'); // paid out
    expect(t).toContain('of ₦30,000 agreed');
    expect(t).toContain('9 days left');
    expect(t).toContain('2 working · 1 pending');
  });

  it('lists what needs attention, with plain wording', async () => {
    const el = await setup();
    const t = text(el);
    expect(t).toContain('1 creator is signed but not fully funded');
    expect(t).toContain('1 post is waiting for your review');
    expect(t).toContain('1 post is overdue');
    expect(t).not.toContain('open dispute');
  });

  it('says so when nothing needs attention', async () => {
    const el = await setup(of(sample({ attention: { fundingDue: 0, disputes: 0, awaitingReview: 0, overdue: 0, quiet: 0 } })));
    expect(text(el)).toContain('Nothing needs your attention');
  });

  it('draws the trend line and reads a day on hover', async () => {
    const el = await setup();
    expect(el.querySelector('path.line')?.getAttribute('d')).toMatch(/^M/);
    expect(el.querySelector('.plot .tip')).toBeNull();
    const svg = el.querySelector('.plot svg') as SVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, width: 640, top: 0, height: 240, right: 640, bottom: 240, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    svg.dispatchEvent(new PointerEvent('pointermove', { clientX: 624 })); // far right = last day
    fixture.detectChanges();
    const tip = text(el.querySelector('.plot .tip') as HTMLElement);
    expect(tip).toContain('2,500');
    expect(tip).toContain('Views');
    expect(tip).toContain('Oct 11');
  });

  it('can be read with the keyboard', async () => {
    const el = await setup();
    const plot = el.querySelector('.plot') as HTMLElement;
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(text(el.querySelector('.plot .tip') as HTMLElement)).toContain('Oct 10');
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.plot .tip')).toBeNull();
  });

  it('switches the measure without changing the scale of another one', async () => {
    const el = await setup();
    const before = el.querySelector('path.line')?.getAttribute('d');
    (el.querySelectorAll('.seg')[0].querySelectorAll('button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text(el)).toContain('Engagement over time');
    expect(el.querySelector('path.line')?.getAttribute('d')).not.toBe(before);
  });

  it('every chart has a table twin with the same numbers', async () => {
    const el = await setup();
    const toggles = [...el.querySelectorAll('.link-btn')].filter((b) => b.textContent?.includes('View as table')) as HTMLButtonElement[];
    expect(toggles).toHaveLength(2);
    toggles[0].click();
    fixture.detectChanges();
    const rows = [...el.querySelectorAll('table')][0].querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(text(rows[2] as HTMLElement)).toContain('2,500');
  });

  it('compares platforms with one bar colour and the value at the tip', async () => {
    const el = await setup();
    const bars = el.querySelectorAll('.bar');
    expect(bars).toHaveLength(2);
    expect(text(bars[0] as HTMLElement)).toContain('Instagram');
    expect(text(bars[0] as HTMLElement)).toContain('2K');
    expect((bars[0].querySelector('.bar__fill') as HTMLElement).style.width).toBe('100%');
    expect((bars[1].querySelector('.bar__fill') as HTMLElement).style.width).toBe('25%');
    // the details live in the hover/focus tooltip too
    expect(text(bars[0].querySelector('.tip') as HTMLElement)).toContain('11.5% engagement');
  });

  it('regroups the bars by format', async () => {
    const el = await setup();
    (el.querySelectorAll('.seg')[1].querySelectorAll('button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text(el)).toContain('Views by format');
    expect(el.querySelectorAll('.bar')).toHaveLength(1);
  });

  it('splits spend into paid out, held and still to fund, with a legend', async () => {
    const el = await setup();
    const t = text(el.querySelector('.legend') as HTMLElement);
    expect(t).toContain('Paid out');
    expect(t).toContain('Held in escrow');
    expect(t).toContain('Still to fund');
    expect(el.querySelectorAll('.stack__seg')).toHaveLength(3);
    expect(text(el)).toContain('Cost per 1,000 views');
    expect(text(el)).toContain('₦8,000');
  });

  it('ranks creators and shows a dash where a number does not exist yet', async () => {
    const el = await setup();
    const rows = [...el.querySelectorAll('table')].pop()!.querySelectorAll('tbody tr');
    expect(text(rows[0] as HTMLElement)).toContain('Ada');
    expect(text(rows[1] as HTMLElement)).toContain('Bola');
    expect(text(rows[1] as HTMLElement)).toContain('—');
    expect(text(el)).toContain('Reel A');
  });

  it('explains an empty campaign instead of drawing empty charts', async () => {
    const empty = sample({
      performance: totals({ posts: 0, views: 0, engagement: 0, engagementRate: 0 }),
      trend: [], byPlatform: [], byFormat: [], topPosts: [],
      delivery: { agreed: 0, delivered: 0, approved: 0, percent: 0, overdue: 0, awaitingReview: 0, pace: null },
      spend: { agreed: 0, funded: 0, held: 0, paidOut: 0, toFund: 0, budget: null, deliveredCost: 0, costPer1kViews: null, costPerEngagement: null },
    });
    const el = await setup(of(empty));
    expect(text(el)).toContain('No results yet');
    expect(el.querySelector('svg')).toBeNull();
  });

  it('offers a retry when the numbers cannot be loaded', async () => {
    const el = await setup(throwError(() => new Error('down')));
    expect(text(el)).toContain("Couldn't load the statistics");
    api.get.mockReturnValue(of(sample()));
    (el.querySelector('.link-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(el)).toContain('2 / 3');
  });

  it('refreshes when something changes on this campaign, but not on another', async () => {
    vi.useFakeTimers();
    try {
      await setup();
      expect(api.get).toHaveBeenCalledTimes(1);
      live.next({ campaignId: 99 });
      vi.advanceTimersByTime(600);
      expect(api.get).toHaveBeenCalledTimes(1);
      live.next({ campaignId: 1 });
      vi.advanceTimersByTime(600);
      expect(api.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
