import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Opportunities } from './opportunities';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { ToastService } from '../../../components/toast/toast.service';
import { PendingInvitesService } from '../../../core/services/invitation/pending-invites.service';
import { ApplicationsInvites } from '../applications-invites/applications-invites';

/** Stands in for the older campaigns' list, which loads its own data. */
@Component({ selector: 'app-applications-invites', template: '' })
class LegacyStub { readonly embedded = input(false); readonly loaded = output<number>(); }

const collab = (id: number, state: string, over: Record<string, unknown> = {}) => ({ id, state, source: 'x', campaignId: id, campaign: `Campaign ${id}`, offer: null, offerExpiresAt: null, acceptedAt: null, ...over });
const offer = (over: Record<string, unknown> = {}) => ({
  lines: [{ quantity: 1, content_type: 'post', platform: 'instagram', rate_per_post: 6000 }], base_fee_total: 6000, reward_allocation: 3000,
  measurement_days: 2, revision_rounds: 2, cancellation_terms_version: 'v1', usage_rights: null, due_date: '2026-12-01', milestones: [], bonus_rule: null,
  brand_review_days: 3, auto_approval_days: 0, cure_period_days: 2, dispute_window_days: 7, ...over,
});
const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe('Opportunities: Find campaigns and My work', () => {
  const setup = (tab: string | null, opts: { work?: any; mine?: any[]; legacy?: number; discover?: any; campaign?: number } = {}) => {
    const params = new BehaviorSubject(convertToParamMap({ ...(tab ? { tab } : {}), ...(opts.campaign ? { campaign: String(opts.campaign) } : {}) }));
    const api = {
      discover: async () => opts.discover ?? ({ eligible: [], ineligibleCount: 0 }),
      apply: vi.fn(async () => ({})),
      mine: async () => opts.mine ?? [],
      myWork: async () => opts.work ?? { needsYou: [] },
    };
    const pending = { legacy: signal(opts.legacy ?? 0), count: signal(0), refresh: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Opportunities],
      providers: [
        provideRouter([]),
        { provide: PackageCampaignService, useValue: api },
        { provide: ToastService, useValue: { show: () => undefined } },
        { provide: PendingInvitesService, useValue: pending },
        { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot: {} } },
      ],
    });
    TestBed.overrideComponent(Opportunities, { remove: { imports: [ApplicationsInvites] }, add: { imports: [LegacyStub] } });
    const f = TestBed.createComponent(Opportunities);
    f.detectChanges();
    return { c: f.componentInstance, params, f };
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const text = (f: any) => (f.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  const tabs = (f: any) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('nav.tabs button')).map((b) => b.textContent!.replace(/\s+/g, ' ').trim());

  describe('which view opens', () => {
    it('opens Find campaigns when the link asks for it, even if something needs the creator', async () => {
      const { c } = setup('discover', { work: { needsYou: [{}] }, mine: [collab(1, 'invited')] });
      await settle();
      expect(c.tab()).toBe('discover');
    });

    it('opens Requests from a My work link when an offer is waiting', async () => {
      const { c } = setup('mine', { mine: [collab(1, 'invited'), collab(2, 'active')] });
      await settle();
      expect(c.tab()).toBe('requests');
    });

    it("opens Requests when another campaign's invite is waiting", async () => {
      const { c } = setup('mine', { legacy: 1 });
      await settle();
      expect(c.tab()).toBe('requests');
    });

    it('opens In progress from a My work link when nothing is waiting for an answer', async () => {
      const { c } = setup('mine', { mine: [collab(2, 'active')] });
      await settle();
      expect(c.tab()).toBe('progress');
    });

    it('opens a stage named in the link', async () => {
      const { c } = setup('done', { mine: [collab(1, 'invited')] });
      await settle();
      expect(c.tab()).toBe('done');
    });

    it('follows the link when it changes while the page stays open', async () => {
      const { c, params } = setup('discover');
      await settle();
      params.next(convertToParamMap({ tab: 'requests' }));
      expect(c.tab()).toBe('requests');
    });

    it('ignores an unknown tab value', async () => {
      const { c } = setup('nonsense');
      await settle();
      expect(c.tab()).toBe('discover');
    });
  });

  describe("campaigns that don't fully match", () => {
    const chk = (key: string, passed: boolean, detail: string) => ({ key, passed, detail });
    const row = (id: number, over: Record<string, unknown> = {}) => ({
      campaignId: id, name: `Campaign ${id}`, product: 'Juice', platforms: ['instagram'], baseFeeBudget: 6000, endsAt: null,
      evaluation: { eligible: false, score: 0, failed: ['niche'], checks: [chk('platform', true, 'Connected on instagram'), chk('niche', false, 'None of your niches match Food')] },
      blockedBy: null, ...over,
    });
    const discover = (rows: any[]) => ({ eligible: [], ineligible: rows, ineligibleCount: rows.length });

    it('opens the campaign a link asks for, unfolded, with every check and why', async () => {
      const { f, c } = setup('discover', { discover: discover([row(31)]), campaign: 31 });
      await settle(); f.detectChanges();
      expect(c.showIneligible()).toBe(true);
      const card = (f.nativeElement as HTMLElement).querySelector('#campaign-31') as HTMLElement;
      expect(card.classList).toContain('focused');
      expect(card.textContent).toContain('✓ Connected on instagram');
      expect(card.textContent).toContain('✗ None of your niches match Food');
      expect(card.textContent).toContain("Doesn't fully match");
    });

    it('lets the creator apply anyway when only preferences are missed', async () => {
      const { f, c } = setup('discover', { discover: discover([row(31)]), campaign: 31 });
      await settle(); f.detectChanges();
      const btn = Array.from((f.nativeElement as HTMLElement).querySelectorAll('#campaign-31 button')).find((b) => /Apply anyway/.test(b.textContent!)) as HTMLButtonElement;
      expect(btn).toBeDefined();
      c.pitches[31] = 'I make food videos too';
      btn.click(); await settle();
      expect((TestBed.inject(PackageCampaignService) as any).apply).toHaveBeenCalledWith(31, 'I make food videos too');
    });

    it('says why, and offers no apply, when a hard rule blocks the creator', async () => {
      const blocked = row(32, {
        evaluation: { eligible: false, score: 0, failed: ['platform', 'followers'], checks: [chk('platform', false, 'No connected account on instagram'), chk('followers', false, 'No follower count on a connected account')] },
        blockedBy: 'No connected account on instagram. Connect it under Profile → Socials to apply.',
      });
      const { f } = setup('discover', { discover: discover([blocked]), campaign: 32 });
      await settle(); f.detectChanges();
      const card = (f.nativeElement as HTMLElement).querySelector('#campaign-32') as HTMLElement;
      expect(card.textContent).toContain('Not open to you');
      expect(card.textContent).toContain('Connect it under Profile → Socials to apply.');
      expect(card.textContent).not.toContain('No follower count'); // the same problem, said once
      expect(Array.from(card.querySelectorAll('button')).some((b) => /Apply/.test(b.textContent!))).toBe(false);
      expect(card.querySelector('a')!.textContent).toContain('Connect an account');
    });

    it('keeps the list folded when no campaign is asked for', async () => {
      const { c } = setup('discover', { discover: discover([row(31)]) });
      await settle();
      expect(c.showIneligible()).toBe(false);
    });
  });

  describe('My work', () => {
    it('shows the stage tabs, with how many requests need an answer', async () => {
      const { f } = setup('mine', { mine: [collab(1, 'invited'), collab(3, 'applied')], legacy: 2 });
      await settle(); f.detectChanges();
      expect(tabs(f)).toEqual(['Requests 3 to answer', 'In progress', 'Done']);
      expect(text(f)).toContain('My work');
    });

    it('has no stage tabs on Find campaigns', async () => {
      const { f } = setup('discover');
      await settle(); f.detectChanges();
      expect(tabs(f)).toEqual([]);
      expect(text(f)).toContain('Find campaigns');
    });

    it('puts offers and applications under Requests', async () => {
      const { f } = setup('requests', { mine: [collab(1, 'invited'), collab(3, 'applied'), collab(2, 'active')] });
      await settle(); f.detectChanges();
      expect(text(f)).toContain('Needs your answer (1)');
      expect(text(f)).toContain('Campaign 1');
      expect(text(f)).toContain('Waiting for brands (1)');
      expect(text(f)).not.toContain('Campaign 2');
    });

    it('puts active work under In progress, and finished work under Done', async () => {
      const { f, c } = setup('progress', { mine: [collab(2, 'active'), collab(4, 'completed'), collab(5, 'cancelled')] });
      await settle(); f.detectChanges();
      expect(text(f)).toContain('Campaign 2');
      expect(text(f)).not.toContain('Campaign 4');
      c.tab.set('done'); f.detectChanges();
      expect(text(f)).toContain('Campaign 4');
      expect(text(f)).toContain('Campaign 5');
      expect(text(f)).not.toContain('Campaign 2');
    });

    it('says so when there are no requests', async () => {
      const { f } = setup('requests');
      await settle(); f.detectChanges();
      (f.componentInstance as Opportunities).legacyItems.set(0); f.detectChanges();
      expect(text(f)).toContain('No requests right now.');
    });

    describe('Requests, compact', () => {
    const offers = () => [
      collab(1, 'invited', { campaign: 'Later', brand: 'Brand A', offer: offer(), offerExpiresAt: inHours(24 * 6 + 1) }),
      collab(2, 'invited', { campaign: 'Soon', brand: 'Brand B', offer: offer({ base_fee_total: 12000, reward_allocation: 0 }), offerExpiresAt: inHours(10) }),
      collab(3, 'selected', { campaign: 'Tomorrowish', offer: offer(), offerExpiresAt: inHours(30) }),
    ];
    const items = (f: any) => Array.from((f.nativeElement as HTMLElement).querySelectorAll('.item.offer'));

    it('puts the offer expiring soonest first, with how long is left and how urgent it is', async () => {
      const { f } = setup('requests', { mine: offers() });
      await settle(); f.detectChanges();
      const rows = items(f);
      expect(rows.map((r: any) => r.querySelector('strong').textContent)).toEqual(['Soon', 'Tomorrowish', 'Later']);
      expect(rows[0].querySelector('.pill')!.className).toContain('pill--red');
      expect(rows[1].querySelector('.pill')!.className).toContain('pill--amber');
      expect(rows[2].querySelector('.pill')!.textContent).toContain('6 days left');
    });

    it('sums an offer up on one line, with the brand, and folds the full terms away', async () => {
      const { f } = setup('requests', { mine: offers() });
      await settle(); f.detectChanges();
      const later = items(f)[2] as HTMLElement;
      expect(later.textContent).toContain('Brand A');
      expect(later.querySelector('.offer__line')!.textContent).toContain('₦6,000 base · up to ₦3,000 in rewards · 1 post on Instagram · due Dec 1');
      expect(later.querySelector('dl.kv')).toBeNull();
      (Array.from(later.querySelectorAll('button')).find((b) => /See full terms/.test(b.textContent!)) as HTMLButtonElement).click();
      f.detectChanges();
      expect(later.querySelector('dl.kv')).not.toBeNull();
      expect(later.textContent).toContain('Hide terms');
    });

    it('leaves rewards out of the line when there are none', async () => {
      const { f } = setup('requests', { mine: offers() });
      await settle(); f.detectChanges();
      expect((items(f)[0] as HTMLElement).querySelector('.offer__line')!.textContent).not.toContain('rewards');
    });

    it('shows the terms before accepting, and does nothing if the creator backs out', async () => {
      const { c } = setup('requests', { mine: offers() });
      await settle();
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const accept = vi.fn();
      (TestBed.inject(PackageCampaignService) as any).accept = accept;
      await c.accept(c.offers()[2]);
      expect(confirm.mock.calls[0][0]).toContain('₦6,000 base · up to ₦3,000 in rewards · 1 post on Instagram');
      expect(confirm.mock.calls[0][0]).toContain('Once you accept, these terms are fixed.');
      expect(accept).not.toHaveBeenCalled();
      confirm.mockRestore();
    });

    it('lists applications one per line, with the brand and when they applied', async () => {
      const { f } = setup('requests', { mine: [collab(5, 'applied', { brand: 'Glow Co', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() })] });
      await settle(); f.detectChanges();
      const line = (f.nativeElement as HTMLElement).querySelector('.row-line')!.textContent!.replace(/\s+/g, ' ');
      expect(line).toContain('Campaign 5');
      expect(line).toContain('Glow Co · applied 2 days ago');
      expect(line).toContain('Waiting');
      expect(line).toContain('Withdraw');
    });

    it('hides a section with nothing in it', async () => {
      const { f } = setup('requests', { mine: [collab(5, 'applied')] });
      await settle(); f.detectChanges();
      expect(text(f)).not.toContain('Needs your answer');
      expect(text(f)).toContain('Waiting for brands (1)');
    });
  });

  it('sends a waiting offer in Needs you to Requests', async () => {
      const { f, c } = setup('progress', { work: { needsYou: [{ key: 'o1', kind: 'offer', campaign: 'Campaign 1', label: 'Answer the offer', collaborationId: 1 }] } });
      await settle(); f.detectChanges();
      const btn = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => /See the offer in Requests/.test(b.textContent ?? '')) as HTMLButtonElement;
      btn.click();
      expect(c.tab()).toBe('requests');
    });
  });
});
