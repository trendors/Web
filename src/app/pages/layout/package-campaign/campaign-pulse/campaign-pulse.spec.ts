import { TestBed } from '@angular/core/testing';
import { CampaignPulsePanel } from './campaign-pulse';
import { CampaignPulse } from '../../../../core/models/package/package.model';

const pulse = (over: Partial<CampaignPulse> = {}): CampaignPulse => ({
  reach: { views: 7000, engagements: 400, engagementRate: 5.71, viewsLast24h: 4000, automaticPosts: 1, reportedPosts: 1, updatedAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  posts: { live: 2, promised: 3 },
  money: { funded: 150000, paidToCreators: 15000, reserved: 30000, bonusPool: 0, available: 105000, returned: 0, costPer1000Views: 2142.86, costPerEngagement: 37.5 },
  topPost: { itemId: 10, collaborationId: 1, creator: 'Ada Obi', platform: 'twitter', url: 'https://x.com/p/10', views: 6000, engagements: 300 },
  milestones: { reached: 1, total: 3, next: { creator: 'Ada Obi', metric: 'views', threshold: 10000, current: 6000, progress: 0.6, amount: 5000 } },
  needsYou: { draftsToReview: 2, applicants: 1, offersWaiting: 0 },
  ...over,
});

describe('CampaignPulsePanel', () => {
  function render(p: CampaignPulse, inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ imports: [CampaignPulsePanel] });
    const f = TestBed.createComponent(CampaignPulsePanel);
    f.componentRef.setInput('pulse', p);
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, el, text: () => el.textContent?.replace(/\s+/g, ' ') ?? '' };
  }

  it('leads with reach, its growth, engagement, posts live and cost per 1,000 views', () => {
    const { el, text } = render(pulse());
    const tiles = Array.from(el.querySelectorAll('.tile')).map((t) => t.textContent!.replace(/\s+/g, ' ').trim());
    expect(tiles[0].replace(/\s/g, '')).toContain('Views7k');
    expect(tiles[0]).toContain('▲ 4k in the last 24h');
    expect(tiles[1]).toContain('5.71%');
    expect(tiles[2]).toContain('2 of 3');
    expect(tiles[3]).toContain('₦2,143');
    expect(text()).toContain('Updated 2h ago');
  });

  it('keeps a large cost short enough for its tile, with the exact amount on hover', () => {
    const { el } = render(pulse({ money: { ...pulse().money!, costPer1000Views: 272727.26, costPerEngagement: 1500.5 } }));
    const value = el.querySelectorAll('.tile')[3].querySelector('.tile__value') as HTMLElement;
    expect(value.textContent!.trim()).toBe('₦272.7k');
    expect(value.title).toBe('₦272,727.26');
    expect(el.querySelectorAll('.tile')[3].textContent).toContain('₦1,501 per engagement');
  });

  it('shows the true cost with our fee beside the creator cost', () => {
    const { el } = render(pulse({ money: { ...pulse().money!, costPer1000ViewsWithFee: 3214.29 } }));
    expect(el.querySelectorAll('.tile')[3].textContent!.replace(/\s+/g, ' ')).toContain('₦3,214 including our fee');
  });

  it('shows the top post with a link to it', () => {
    const { el, text } = render(pulse());
    expect(text()).toContain('Ada Obi on X');
    expect(text()).toContain('6k views · 300 engagements');
    expect(el.querySelector<HTMLAnchorElement>('.top-post a')!.href).toBe('https://x.com/p/10');
  });

  it('shows how close the next milestone is', () => {
    const { el, text } = render(pulse());
    expect(text()).toContain('1 of 3 reached');
    expect(text()).toContain('Next: Ada Obi reaching 10k views earns ₦5,000');
    expect(text()).toContain('60% there');
    expect((el.querySelector('.milestone .bar span') as HTMLElement).style.width).toBe('60%');
  });

  it('celebrates when every milestone is reached', () => {
    const { text } = render(pulse({ milestones: { reached: 2, total: 2, next: null } }));
    expect(text()).toContain('Every milestone has been reached.');
  });

  it('splits the budget into paid, held and free', () => {
    const { el, text } = render(pulse(), { onTheWay: 3000, nextCheck: '2 days' });
    expect((el.querySelector('.budget__paid') as HTMLElement).style.width).toBe('10%');
    expect((el.querySelector('.budget__held') as HTMLElement).style.width).toBe('20%');
    expect(text()).toContain('30% used or committed of ₦150,000');
    expect(text()).toContain('₦3,000 is on its way to creators. Next bonus is decided in 2 days.');
  });

  it('lists what needs the brand and opens the creators tab', () => {
    const { f, el } = render(pulse());
    const chips = Array.from(el.querySelectorAll('.needs__chip')).map((c) => c.textContent!.trim());
    expect(chips).toEqual(['2 drafts to review', '1 application to answer']);
    const opened: string[] = [];
    f.componentInstance.openTab.subscribe((t) => opened.push(t));
    (el.querySelector('.needs__chip') as HTMLButtonElement).click();
    expect(opened).toEqual(['creators']);
  });

  it('is honest about where the numbers come from', () => {
    expect(render(pulse()).text()).toContain('1 post is read straight from the platform; 1 from screenshots our team checked.');
  });

  it('does not say "0 posts are read from the platform" when every number is from checked screenshots', () => {
    const t = render(pulse({ reach: { ...pulse().reach, automaticPosts: 0, reportedPosts: 2 } })).text();
    expect(t).toContain('These numbers come from screenshots our team checked.');
    expect(t).not.toContain('0 posts');
  });

  it('says when nothing is live yet, without made-up numbers', () => {
    const { text } = render(pulse({
      reach: { views: 0, engagements: 0, engagementRate: null, viewsLast24h: 0, automaticPosts: 0, reportedPosts: 0, updatedAt: null },
      posts: { live: 0, promised: 2 }, topPost: null,
      money: { ...pulse().money!, costPer1000Views: null, costPerEngagement: null },
    }));
    expect(text()).toContain('Your numbers appear here once the first post is verified live.');
    expect(text().replace(/\s/g, '')).toContain('Engagement–');
    expect(text()).toContain('once creators are paid');
  });
});
