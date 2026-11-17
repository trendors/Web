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

const collab = (id: number, state: string) => ({ id, state, source: 'x', campaignId: id, campaign: `Campaign ${id}`, offer: null, offerExpiresAt: null, acceptedAt: null });

describe('Opportunities: Find campaigns and My work', () => {
  const setup = (tab: string | null, opts: { work?: any; mine?: any[]; legacy?: number } = {}) => {
    const params = new BehaviorSubject(convertToParamMap(tab ? { tab } : {}));
    const api = {
      discover: async () => ({ eligible: [], ineligibleCount: 0 }),
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
      expect(text(f)).toContain('Offers for you');
      expect(text(f)).toContain('Campaign 1');
      expect(text(f)).toContain('Waiting for the brand');
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

    it('sends a waiting offer in Needs you to Requests', async () => {
      const { f, c } = setup('progress', { work: { needsYou: [{ key: 'o1', kind: 'offer', campaign: 'Campaign 1', label: 'Answer the offer', collaborationId: 1 }] } });
      await settle(); f.detectChanges();
      const btn = Array.from((f.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => /See the offer in Requests/.test(b.textContent ?? '')) as HTMLButtonElement;
      btn.click();
      expect(c.tab()).toBe('requests');
    });
  });
});
