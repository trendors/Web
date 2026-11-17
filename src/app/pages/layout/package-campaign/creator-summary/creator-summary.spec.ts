import { TestBed } from '@angular/core/testing';
import { CreatorSummaryPanel } from './creator-summary';
import { PackageCampaignService } from '../../../../core/services/package/package-campaign.service';
import { CreatorSummary } from '../../../../core/models/package/package.model';

const summary = (over: Partial<CreatorSummary> = {}): CreatorSummary => ({
  userId: 7, name: 'ada_creates', displayName: 'Ada Obi', headline: 'Food creator', bio: 'I cook.', location: 'Lagos, Nigeria',
  niches: ['Food'], audience: { locations: ['Nigeria'], gender: null, ageRange: '18-24' }, engagementRate: '4.2%',
  accounts: [
    { platform: 'instagram', handle: 'ada.eats', followers: 15400, verified: false },
    { platform: 'twitter', handle: 'ada', followers: 1300, verified: true },
  ],
  totalFollowers: 16700,
  fit: { score: 72.5, eligible: true, checks: [{ key: 'niche', passed: true, detail: 'Works in Food' }] },
  record: { completed: 3, active: 1, cancelled: 0 },
  onThisCampaign: null,
  ...over,
} as CreatorSummary);

describe('CreatorSummaryPanel', () => {
  async function open(data: CreatorSummary | Error, inputs: Record<string, unknown> = {}) {
    const api = { creatorSummary: vi.fn(async () => { if (data instanceof Error) throw data; return data; }) };
    TestBed.configureTestingModule({ imports: [CreatorSummaryPanel], providers: [{ provide: PackageCampaignService, useValue: api }] });
    const f = TestBed.createComponent(CreatorSummaryPanel);
    f.componentRef.setInput('campaignId', 42);
    f.componentRef.setInput('userId', 7);
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, api, el, text: () => el.textContent?.replace(/\s+/g, ' ') ?? '' };
  }

  it('loads the creator for this campaign', async () => {
    const { api } = await open(summary());
    expect(api.creatorSummary).toHaveBeenCalledWith(42, 7);
  });

  it('shows the fit and every check', async () => {
    const { text } = await open(summary());
    expect(text()).toContain('Fit 72.5%');
    expect(text()).toContain('Meets every filter');
    expect(text()).toContain('✓ Works in Food');
  });

  it('shows followers on every connected account, with X named and verified marked', async () => {
    const { el, text } = await open(summary());
    const rows = Array.from(el.querySelectorAll('.cs__accounts li')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(rows.map((r) => r.replace(/\s/g, ''))).toEqual(['Instagram@ada.eats15k', 'X@ada✓1.3k']);
    expect(text()).toContain('17k followers across 2 accounts.');
  });

  it('says so when no account is connected', async () => {
    const { text } = await open(summary({ accounts: [], totalFollowers: 0 }));
    expect(text()).toContain('No social account connected yet');
  });

  it('lets the brand invite someone outside the filters, and says they miss one', async () => {
    const { f, el, text } = await open(summary({ fit: { score: 10, eligible: false, checks: [{ key: 'followers', passed: false, detail: 'Below 5,000 followers' }] } }));
    expect(text()).toContain('Outside your filters');
    expect(text()).toContain('They miss one of your filters. You can still invite them.');
    const sent: unknown[] = [];
    f.componentInstance.invite.subscribe((e) => sent.push(e));
    (el.querySelector('.cs__btn') as HTMLButtonElement).click();
    expect(sent).toEqual([{ userId: 7, name: 'Ada Obi' }]);
  });

  it('offers no invite to someone already on the campaign', async () => {
    const { el, text } = await open(summary({ onThisCampaign: { collaborationId: 3, state: 'active' } }));
    expect(el.querySelector('.cs__btn')).toBeNull();
    expect(text()).toContain('Already on this campaign');
  });

  it("offers no invite, and says why, when the package's follower range rules them out", async () => {
    const { el, text } = await open(summary({ packageProblem: 'This package is for creators with at least 2,000 followers on X; they have 152.' }));
    expect(el.querySelector('.cs__btn')).toBeNull();
    expect(text()).toContain('at least 2,000 followers on X; they have 152.');
  });

  it('offers no invite when the campaign is not taking creators', async () => {
    const { el } = await open(summary(), { canInvite: false });
    expect(el.querySelector('.cs__btn')).toBeNull();
  });

  it('closes on Escape', async () => {
    const { f } = await open(summary());
    let closed = 0;
    f.componentInstance.closed.subscribe(() => closed++);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(1);
  });

  it('shows the reason when the creator cannot be loaded', async () => {
    const { text } = await open(Object.assign(new Error('x'), { error: { message: 'Creator not found.' } }));
    expect(text()).toContain('Creator not found.');
  });
});
