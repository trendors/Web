import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ShareCampaignSheet } from './share-campaign-sheet';
import { ShareCampaignApiService } from '../../core/services/share-campaign/share-campaign.service';
import { UtilService } from '../../core/services/utility/utility.service';
import { ToastService } from '../toast/toast.service';
import { MyShare, MyShares, ShareTerms } from '../../core/models/share-campaign/share-campaign.model';

const HOUR = 3_600_000;
const terms = (over: Partial<ShareTerms> = {}): ShareTerms => ({
  payPerShare: 100, pool: 10000, serviceFee: 2000, serviceFeePct: 20, totalPayable: 12000, maxSharesPerCreator: 2,
  hashtag: 'NewDrop', holdHours: 24, minFollowers: 0, funded: true, remaining: 5000, ...over,
});
const share = (over: Partial<MyShare> = {}): MyShare => ({
  id: 7, state: 'started', pay: 100, hashtag: 'NewDrop', holdHours: 24, expiresAt: new Date(Date.now() + 10 * HOUR).toISOString(),
  postUrl: null, holdUntil: null, reason: null, attempts: 0, ...over,
});
const mine = (shares: MyShare[] = [], over: Partial<MyShares> = {}): MyShares => ({ shares, maxShares: 2, closed: false, ...over });

describe('ShareCampaignSheet', () => {
  let fixture: ComponentFixture<ShareCampaignSheet>;
  let c: ShareCampaignSheet;
  let api: { terms: ReturnType<typeof vi.fn>; mine: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; submit: ReturnType<typeof vi.fn> };
  let toast: { show: ReturnType<typeof vi.fn> };
  let dismiss: ReturnType<typeof vi.fn>;

  async function open(t: ShareTerms | Error = terms(), m: MyShares | Error = mine()) {
    api.terms.mockImplementation(async () => { if (t instanceof Error) throw t; return t; });
    api.mine.mockImplementation(async () => { if (m instanceof Error) throw m; return m; });
    fixture = TestBed.createComponent(ShareCampaignSheet);
    c = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(c.loading()).toBe(false));
    fixture.detectChanges();
  }
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = (label: RegExp) => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => label.test(b.textContent ?? '')) as HTMLButtonElement | undefined;

  beforeEach(async () => {
    api = { terms: vi.fn(), mine: vi.fn(), start: vi.fn(async () => share()), submit: vi.fn() };
    toast = { show: vi.fn() };
    dismiss = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ShareCampaignSheet],
      providers: [
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: { post: { id: 3, text: 'Big launch today', campaign: { id: 50 } } } },
        { provide: MatBottomSheetRef, useValue: { dismiss } },
        { provide: ShareCampaignApiService, useValue: api },
        { provide: UtilService, useValue: { fetchAiRewrite: () => of([{ text: 'A friendlier take' }]) } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  it('shows what a share earns and the rules', async () => {
    await open();
    expect(text()).toContain('Earn ₦100 per verified share');
    expect(text()).toContain('#NewDrop');
    expect(text()).toContain('24 hours');
    expect(text()).toContain('0 of 2 shares used');
    expect(text()).toContain('₦5,000 of budget left');
  });

  it('offers the original and the rewritten versions, and lets the creator start', async () => {
    await open();
    expect(text()).toContain('Big launch today');
    expect(text()).toContain('A friendlier take');
    expect(c.canStart()).toBe(true);
    expect(button(/Start sharing/)?.disabled).toBe(false);
  });

  it('starting sets the pay aside, then shows the post step', async () => {
    await open();
    api.mine.mockImplementation(async () => mine([share()]));
    await c.start();
    fixture.detectChanges();
    expect(api.start).toHaveBeenCalledWith(50);
    expect(c.openShare()?.id).toBe(7);
    expect(text()).toContain('Open X to post');
    expect(text()).toContain('Then paste the link to your post');
    expect(button(/Start sharing/)).toBeUndefined();
  });

  describe('the text that goes to X', () => {
    it('adds the required hashtag, the #ad disclosure and the link', async () => {
      await open();
      expect(c.composedText()).toBe(`Big launch today #NewDrop #ad\n\nView more: ${(c as any).postLink}`);
    });

    it('does not add the hashtag twice, or a second #ad', async () => {
      await open();
      c.choose('Loving this #newdrop #AD');
      expect(c.composedText().split('\n')[0]).toBe('Loving this #newdrop #AD');
    });

    it('leaves the disclosure out when switched off', async () => {
      await open();
      c.includeAd.set(false);
      expect(c.composedText().split('\n')[0]).toBe('Big launch today #NewDrop');
    });

    it('asks for no hashtag when the campaign sets none', async () => {
      await open(terms({ hashtag: null }));
      c.includeAd.set(false);
      expect(c.composedText().split('\n')[0]).toBe('Big launch today');
    });

    it('counts a link as 23 characters, as X does', async () => {
      await open(terms({ hashtag: null }));
      c.includeAd.set(false);
      expect(c.length()).toBe('Big launch today\n\nView more: '.length + 23);
    });

    it('opens X straight from the click with that text', async () => {
      await open();
      const win = vi.spyOn(window, 'open').mockReturnValue({ closed: false } as any);
      c.postOnX();
      const url = String(win.mock.calls[0][0]);
      expect(url).toContain('https://twitter.com/intent/tweet?text=');
      expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('#NewDrop');
      win.mockRestore();
    });

    it('says so when the pop-up is blocked', async () => {
      await open();
      const win = vi.spyOn(window, 'open').mockReturnValue(null);
      c.postOnX();
      expect(toast.show).toHaveBeenCalledWith('Allow pop-ups for this site to post.', 'error');
      win.mockRestore();
    });
  });

  describe('sending the post', () => {
    const started = () => mine([share()]);

    it('sends the link, and says the post is verified', async () => {
      await open(terms(), started());
      api.submit.mockResolvedValue({ accepted: true, reason: null, share: share({ state: 'verified', holdHours: 24 }) });
      api.mine.mockImplementation(async () => mine([share({ state: 'verified', holdUntil: new Date(Date.now() + 20 * HOUR).toISOString() })]));
      c.pasteUrl.set(' https://x.com/ada/status/123 ');
      await c.submit();
      fixture.detectChanges();
      expect(api.submit).toHaveBeenCalledWith(7, 'https://x.com/ada/status/123');
      expect(toast.show).toHaveBeenCalledWith(expect.stringContaining('verified'), 'success', 6000);
      expect(c.pasteUrl()).toBe('');
      expect(text()).toContain('Verified, on hold');
      expect(text()).toContain('paid after');
    });

    it('shows the exact reason when the post is not accepted, and keeps the link field', async () => {
      await open(terms(), started());
      api.submit.mockResolvedValue({ accepted: false, reason: 'The post must include #NewDrop. Add it and post again.', share: share() });
      c.pasteUrl.set('https://x.com/ada/status/123');
      await c.submit();
      fixture.detectChanges();
      expect(text()).toContain('That post was not accepted');
      expect(text()).toContain('The post must include #NewDrop');
      expect(c.pasteUrl()).toBe('https://x.com/ada/status/123');
    });

    it('shows the server message when the check could not run', async () => {
      await open(terms(), started());
      api.submit.mockRejectedValue({ error: { message: 'We could not check your post just now. Nothing is lost: please try again in a few minutes.' } });
      c.pasteUrl.set('https://x.com/ada/status/123');
      await c.submit();
      fixture.detectChanges();
      expect(text()).toContain('try again in a few minutes');
      expect(c.busy()).toBe(false);
    });

    it('does nothing without a link', async () => {
      await open(terms(), started());
      await c.submit();
      expect(api.submit).not.toHaveBeenCalled();
      expect(button(/Send my post/)?.disabled).toBe(true);
    });
  });

  describe('when the creator cannot start', () => {
    it('is blocked once every share is used', async () => {
      await open(terms(), mine([share({ id: 1, state: 'paid' }), share({ id: 2, state: 'verified' })]));
      expect(c.canStart()).toBe(false);
      expect(text()).toContain('You have used all 2 shares for this campaign.');
      expect(button(/Start sharing/)).toBeUndefined();
    });

    it('says "already shared" for a one-share campaign', async () => {
      await open(terms({ maxSharesPerCreator: 1 }), mine([share({ state: 'paid' })], { maxShares: 1 }));
      expect(text()).toContain('You have already shared this campaign.');
    });

    it('is blocked when the budget has run out, or the campaign has closed', async () => {
      await open(terms({ remaining: 50 }));
      expect(text()).toContain("budget has been used up");
      await open(terms(), mine([], { closed: true }));
      expect(text()).toContain('This campaign has closed.');
    });

    it('still lets a creator whose last share expired or was not paid try again', async () => {
      await open(terms(), mine([share({ id: 1, state: 'expired', reason: 'No post was submitted in time.' })]));
      expect(c.canStart()).toBe(true);
      expect(text()).toContain('Expired');
      expect(text()).toContain('No post was submitted in time.');
    });

    it('ignores a started share whose time has run out', async () => {
      await open(terms(), mine([share({ expiresAt: new Date(Date.now() - HOUR).toISOString() })]));
      expect(c.openShare()).toBeNull();
      expect(c.canStart()).toBe(true);
    });
  });

  it('shows the paid share and its amount', async () => {
    await open(terms(), mine([share({ state: 'paid', pay: 100 })]));
    expect(text()).toContain('Paid');
    expect(text()).toContain('₦100');
  });

  it('says why when the campaign cannot be loaded', async () => {
    await open(Object.assign(new Error('x'), { error: { message: 'This is not a share campaign.' } }) as any);
    expect(text()).toContain('This is not a share campaign.');
  });

  it('closes', async () => {
    await open();
    c.close();
    expect(dismiss).toHaveBeenCalled();
  });
});
