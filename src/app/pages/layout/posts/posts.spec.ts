import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MockStore } from '@ngrx/store/testing';
import { EMPTY, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Posts } from './posts';
import { PostActions } from '../../../store/posts/post/posts.actions';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import {
  selectAllPosts,
  selectHasMorePosts,
  selectIsLoadingMore,
  selectIsLoadingPosts,
  selectPostsError,
} from '../../../store/posts/post/posts.selectors';
import { SocketService } from '../../../socket.service';
import { CampaignInfluencerService } from '../../../core/api';
import { Post } from '../../../core/models/posts/post.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { ShareCampaignSheet } from '../../../components/share-campaign-sheet/share-campaign-sheet';
import { ShareSheet } from '../../../components/share-sheet/share-sheet';

describe('Posts', () => {
  let component: Posts;
  let fixture: ComponentFixture<Posts>;
  let store: MockStore;
  let dispatched: { type: string }[];

  const post = {
    id: 5,
    text: 'hello',
    likes: [{ id: 1, userId: 1, postId: 5 }],
    campaign: { id: 9, name: 'C', access: 'application' },
  } as unknown as Post;

  const campaignInfluencerApi = {
    campaignInfluencerControllerFindByUser: vi.fn(() => of({ data: [{ campaign: { id: 9 } }] })),
    campaignInfluencerControllerCreate: vi.fn(() => of({})),
  };

  const packageApi = { mine: vi.fn(async (): Promise<unknown[]> => []), discover: vi.fn(async (): Promise<unknown> => ({ eligible: [], ineligible: [], ineligibleCount: 0 })) };

  beforeEach(async () => {
    packageApi.mine.mockResolvedValue([]);
    packageApi.discover.mockResolvedValue({ eligible: [], ineligible: [], ineligibleCount: 0 });
    await TestBed.configureTestingModule({
      imports: [Posts],
      providers: [
        provideRouter([]),
        provideAppMockStore({
          selectors: [
            { selector: selectCurrentUser, value: { id: 1, trendors_id: 'TR-1', user_name: 'ada' } },
            { selector: selectAllPosts, value: [post] },
            { selector: selectIsLoadingPosts, value: false },
            { selector: selectIsLoadingMore, value: false },
            { selector: selectHasMorePosts, value: true },
            { selector: selectPostsError, value: null },
          ],
        }),
        { provide: SocketService, useValue: { listenToNewPosts: () => EMPTY } },
        { provide: CampaignInfluencerService, useValue: campaignInfluencerApi },
        { provide: PackageCampaignService, useValue: packageApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatched = [];
    store.scannedActions$.subscribe((a) => dispatched.push(a));
    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the first page of the active tab into the store', () => {
    const load = dispatched.find((a) => a.type === PostActions.findAllPosts.type) as any;
    expect(load.query).toMatchObject({ page: 0, campaignType: 'application' });
  });

  it('should page through the store on load more', () => {
    component.onLoadMore();
    expect(dispatched.at(-1)?.type).toBe(PostActions.loadMorePosts.type);
  });

  it('should send the pre-click like state so a failure can be rolled back', () => {
    component.onLikePost(post);
    const like = dispatched.at(-1) as any;
    expect(like.type).toBe(PostActions.likePost.type);
    expect(like.wasLiked).toBe(true);
  });

  it('should mark campaigns the user already applied to, from the server', () => {
    expect(campaignInfluencerApi.campaignInfluencerControllerFindByUser).toHaveBeenCalledWith(1, false);
    expect(component.isAppliedByCurrentUser(post)).toBe(true);
  });

  it('offers "View terms", not Apply, on a package campaign in the feed', () => {
    const pkg = { ...post, id: 8, campaign: { id: 48, name: 'Pkg', access: 'application', is_package: true } } as unknown as Post;
    store.overrideSelector(selectAllPosts, [pkg]);
    store.refreshState();
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.apply-btn') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('View terms');
    expect(link?.getAttribute('href')).toContain('/home/opportunities');
    expect(link?.getAttribute('href')).toContain('tab=discover');
    expect(link?.getAttribute('href')).toContain('campaign=48'); // opens that campaign, even if it doesn't fully match
    expect((fixture.nativeElement as HTMLElement).querySelector('button.apply-btn')).toBeNull();
  });

  describe('a package campaign the creator is already part of', () => {
    const pkg = { ...post, id: 8, campaign: { id: 48, name: 'Pkg', access: 'application', is_package: true } } as unknown as Post;
    const show = async (state: string | null) => {
      packageApi.mine.mockResolvedValue(state ? [{ id: 1, campaignId: 48, state }] : []);
      await (component as any).loadPackageStanding();
      store.overrideSelector(selectAllPosts, [pkg]);
      store.refreshState();
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector('.applied-pill, a.apply-btn') as HTMLAnchorElement | null;
    };
    it.each([['applied', 'Applied', 'mine'], ['invited', 'Offer waiting', 'mine'], ['selected', 'Offer waiting', 'mine'], ['active', 'In progress', 'mine'], ['completed', 'Completed', 'done']])(
      'says %s as "%s", linking to My work', async (state, text, tab) => {
        const el = await show(state);
        expect(el?.textContent?.trim()).toBe(text);
        expect(el?.getAttribute('href')).toContain(`tab=${tab}`);
      });
    it.each([['withdrawn', 'You withdrew'], ['declined', 'You declined'], ['not_selected', 'Not selected'], ['expired', 'Closed']])(
      'says %s as "%s", muted, instead of offering terms it cannot apply to', async (state, text) => {
        const el = await show(state);
        expect(el?.textContent?.trim()).toBe(text);
        expect(el?.classList).toContain('applied-pill--muted');
        expect(el?.getAttribute('href')).toContain('tab=done');
      });
    it('offers View terms when there is no history', async () => {
      expect((await show(null))?.textContent?.trim()).toBe('View terms');
    });
    it('says a campaign that has ended or paused is not taking creators', async () => {
      const at = async (campaign: Record<string, unknown>) => {
        packageApi.mine.mockResolvedValue([]);
        await (component as any).loadPackageStanding();
        store.overrideSelector(selectAllPosts, [{ ...pkg, campaign: { ...(pkg as any).campaign, ...campaign } } as unknown as Post]);
        store.refreshState();
        fixture.detectChanges();
        const el = (fixture.nativeElement as HTMLElement).querySelector('.applied-pill, a.apply-btn')!;
        return [el.textContent!.trim(), el.tagName];
      };
      expect(await at({ lifecycle: 'completed', status: 'active' })).toEqual(['Campaign ended', 'SPAN']);
      expect(await at({ lifecycle: 'active', status: 'paused' })).toEqual(['Paused', 'SPAN']);
      expect(await at({ lifecycle: 'active', status: 'active' })).toEqual(['View terms', 'A']);
    });
    it('falls back to View terms when the lookup fails', async () => {
      packageApi.mine.mockRejectedValue(new Error('403'));
      await (component as any).loadPackageStanding();
      expect((component as any).packageStatus(pkg)).toBeNull();
    });
  });

  describe('the terms and the fit, on the card', () => {
    const pkg = { ...post, id: 8, campaign: { id: 48, name: 'Pkg', access: 'application', is_package: true } } as unknown as Post;
    const terms = { baseFee: 3000, posts: [{ content_type: 'post', platform: 'x', quantity: 1 }], rewards: [{ metric: 'views', threshold: 1500, amount: 3000 }], rewardTotal: 3000, windowHours: 72, revisions: 2, dueDate: '2026-11-30' };
    const requirements = { niches: ['Fashion'], creatorCountries: [], audienceCountries: [], followerMin: 200, followerMax: 1000, platforms: ['twitter'] };
    const row = (over: Record<string, unknown>) => ({ campaignId: 48, name: 'Pkg', product: null, platforms: ['x'], baseFeeBudget: 0, endsAt: null, terms, requirements, blockedBy: null, ...over });
    const render = async (found: unknown) => {
      packageApi.discover.mockResolvedValue(found);
      await (component as any).loadPackageStanding();
      store.overrideSelector(selectAllPosts, [pkg]);
      store.refreshState();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      return { strip: el.querySelector('.offer-strip'), button: el.querySelector('a.apply-btn') };
    };

    it('shows the pay and that the creator fits, and offers to apply', async () => {
      const { strip, button } = await render({ eligible: [row({ evaluation: { eligible: true, score: 72, checks: [], failed: [] } })], ineligible: [], ineligibleCount: 0 });
      expect(strip!.textContent).toContain('₦3,000 for 1 post on X · up to ₦3,000 more in rewards');
      expect(strip!.querySelector('.offer-strip__fit')!.textContent!.trim()).toBe('You fit · 72%');
      expect(button!.textContent!.trim()).toBe('Apply');
      expect(button!.getAttribute('href')).toContain('campaign=48');
      expect((fixture.nativeElement as HTMLElement).querySelector('.requirements')).toBeNull(); // the strip already says where
    });

    it("says when the creator doesn't fully match, or can't apply", async () => {
      const soft = await render({ eligible: [], ineligible: [row({ evaluation: { eligible: false, score: 0, checks: [], failed: ['niche'] } })], ineligibleCount: 1 });
      expect(soft.strip!.querySelector('.offer-strip__fit')!.textContent!.trim()).toBe("Doesn't fully match");
      expect(soft.button!.textContent!.trim()).toBe('View terms');
      const hard = await render({ eligible: [], ineligible: [row({ evaluation: { eligible: false, score: 0, checks: [], failed: ['platform'] }, blockedBy: 'No connected account on x.' })], ineligibleCount: 1 });
      expect(hard.strip!.querySelector('.offer-strip__fit')!.textContent!.trim()).toBe('Not open to you');
    });

    it('lists what the campaign needs, marking what the creator meets and misses', async () => {
      const { strip } = await render({ eligible: [], ineligible: [row({ evaluation: { eligible: false, score: 0, failed: ['followers'], checks: [{ key: 'platform', passed: true }, { key: 'niche', passed: true }, { key: 'followers', passed: false }] } })], ineligibleCount: 1 });
      const needs = Array.from(strip!.querySelectorAll('.need')).map((n) => [n.textContent!.replace(/\s+/g, ' ').trim(), n.getAttribute('data-met')]);
      expect(needs).toEqual([['✗ 200–1,000 followers on X', 'false'], ['✓ Fashion', 'true']]);
    });

    it('shows no strip when the lookup fails, and the feed still works', async () => {
      packageApi.discover.mockRejectedValue(new Error('403'));
      await (component as any).loadPackageStanding();
      store.overrideSelector(selectAllPosts, [pkg]);
      store.refreshState();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.offer-strip')).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('a.apply-btn')!.textContent!.trim()).toBe('View terms');
    });
  });

  describe('the Share & earn tab', () => {
    const tabs = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ui-tab')) as HTMLElement[];
    const clean = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();

    it('comes second, tagged Coming soon, after Campaigns', () => {
      expect(tabs().map((t) => clean(t))).toEqual(['Campaigns', 'Share & earn Coming soon']);
      expect(tabs()[0].querySelector('.tab-soon')).toBeNull();
      expect(tabs()[1].querySelector('.tab-soon')?.textContent?.trim()).toBe('Coming soon');
    });

    it('leaves Campaigns, the first tab, as the one that opens', () => {
      expect(component.activePostTab).toBe('application');
      expect(tabs()[0].classList).toContain('active');
      expect(tabs()[1].classList).not.toContain('active');
    });

    it('says in one line what sharing does, only on that tab', () => {
      const hint = () => (fixture.nativeElement as HTMLElement).querySelector('.tab-hint');
      expect(hint()).toBeNull();
      tabs()[1].click();
      fixture.detectChanges();
      expect(clean(hint())).toBe("Share a brand's post on X and get paid for every share that stays up.");
    });

    it('has a helpful empty state for each tab', () => {
      store.overrideSelector(selectAllPosts, []);
      store.refreshState();
      fixture.detectChanges();
      const empty = () => clean((fixture.nativeElement as HTMLElement).querySelector('.ui-empty'));
      expect(empty()).toContain('No posts yet');
      tabs()[1].click();
      fixture.detectChanges();
      expect(empty()).toContain('No campaigns to share yet');
      expect(empty()).toContain('When brands launch share campaigns, they will show up here.');
    });
  });

  describe('sharing from the feed', () => {
    const sheetOpen = () => {
      const bottomSheet = (component as any).bottomSheet;
      return vi.spyOn(bottomSheet, 'open').mockReturnValue({} as any);
    };
    it('opens the pay-per-share sheet for a share campaign', () => {
      const open = sheetOpen();
      const shareCampaign = { ...post, campaign: { id: 50, name: 'Push', access: 'open', is_share: true } } as unknown as Post;
      component.openShareMenu(shareCampaign);
      expect(open.mock.calls[0][0]).toBe(ShareCampaignSheet);
      expect(open.mock.calls[0][1]).toMatchObject({ data: { post: shareCampaign } });
    });
    it('opens the ordinary share sheet for anything else', () => {
      const open = sheetOpen();
      component.openShareMenu({ ...post, campaign: { id: 9, name: 'Old', access: 'open', is_share: false } } as unknown as Post);
      expect(open.mock.calls[0][0]).toBe(ShareSheet);
    });
  });

  it('keeps Apply on an ordinary campaign', () => {
    const plain = { ...post, id: 9, campaign: { id: 7, name: 'Old', access: 'application', is_package: false } } as unknown as Post;
    store.overrideSelector(selectAllPosts, [plain]);
    store.refreshState();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button.apply-btn')?.textContent?.trim()).toBe('Apply');
  });

  it('sends a creator who taps Apply on a package campaign to Find campaigns instead of showing an error', () => {
    const fresh = { ...post, id: 6, campaign: { id: 48, name: 'Pkg', access: 'application' } } as unknown as Post;
    campaignInfluencerApi.campaignInfluencerControllerCreate.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'This is a package campaign: apply or invite through the collaboration workflow.' } })) as any,
    );
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.applyToCampaign(fresh);
    expect(nav).toHaveBeenCalledWith(['/home/opportunities'], { queryParams: { tab: 'discover' } });
  });
});
