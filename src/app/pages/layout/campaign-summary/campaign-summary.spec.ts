import { provideAppMockStore } from '../../../core/testing/mock-store';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, firstValueFrom, NEVER, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MockStore } from '@ngrx/store/testing';

import { CampaignSummary } from './campaign-summary';
import type { CampaignInfluencer } from '../../../core/api/model/campaignInfluencer';
import { CampaignInfluencerPostService, CampaignInfluencerService } from '../../../core/api';
import { selectCampaignList, selectCampaignLoading } from '../../../store/campaign/campaign.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';
import {
  mockBrandUser,
  mockCampaigns,
  postsEnvelopeForCampaign,
  rosterEnvelopeFor,
} from '../../../core/testing/campaign.fixtures';

describe('CampaignSummary', () => {
  let component: CampaignSummary;
  let fixture: ComponentFixture<CampaignSummary>;
  let store: MockStore;

  // The roster mock honors `withPosts`: populated except assignment 201, whose
  // posts must be backfilled from the posts endpoint (proves the merge fallback).
  const rosterApi = {
    campaignInfluencerControllerUpdate: vi.fn((_id: number, _dto: unknown): any => of({ error: false })),
    campaignInfluencerControllerFindByCampaign: vi.fn((campaignId: number, withPosts?: boolean) => {
      const envelope = rosterEnvelopeFor(campaignId);
      return of({
        ...envelope,
        data: withPosts
          ? envelope.data.map((assignment) =>
              assignment.id === 201 ? { ...assignment, influencerPosts: [] } : assignment,
            )
          : envelope.data.map((assignment) => ({ ...assignment, influencerPosts: [] })),
      });
    }),
  };

  const postsApi = {
    campaignInfluencerPostControllerFindByCampaign: vi.fn((campaignId: number) =>
      of(postsEnvelopeForCampaign(campaignId)),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignSummary],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        provideAppMockStore(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
            queryParamMap: of(convertToParamMap({})),
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              queryParams: {},
              fragment: null,
            },
          },
        },
        { provide: CampaignInfluencerService, useValue: rosterApi },
        { provide: CampaignInfluencerPostService, useValue: postsApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCampaignList, mockCampaigns);
    store.overrideSelector(selectCampaignLoading, false);
    store.overrideSelector(selectCurrentUser, mockBrandUser as any);

    fixture = TestBed.createComponent(CampaignSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve the campaign matching the route id', async () => {
    const campaign = await firstValueFrom(component.data$);
    expect(campaign?.id).toBe(1);
    expect(campaign?.name).toBe('GlowSkin Skincare Launch');
  });

  it('should load the roster for the routed campaign with posts populated', () => {
    expect(rosterApi.campaignInfluencerControllerFindByCampaign).toHaveBeenCalledWith(1, true, 'body', false, {
      transferCache: false,
    });
    expect(component.influencers()).toHaveLength(5);
  });

  it('should populate posts and metrics from the posts endpoint', () => {
    expect(postsApi.campaignInfluencerPostControllerFindByCampaign).toHaveBeenCalledWith(1, 'body', false, {
      transferCache: false,
    });
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor');
    expect(component.postsOf(ada!)).toHaveLength(3);
    expect(component.postsOf(ada!).find((p) => p.id === 301)?.latest?.views).toBe(12500);
  });

  it('should keep invited assignments out of the Influencers tab', () => {
    expect(component.rosterInfluencers()).toHaveLength(4);
    expect(component.rosterInfluencers().map((i) => component.statusOf(i))).not.toContain('Invited');
    expect(component.pendingInfluencers().map((i) => component.displayName(i))).toEqual(['zainab.y']);
  });

  it('should derive influencer stats from the live roster', () => {
    expect(component.influencerStats()).toEqual({ total: 5, active: 2, completed: 1, cancelled: 1 });
  });

  it('should resolve a relative campaign file against the API base URL', () => {
    const image = component.campaignImage(mockCampaigns[0]);
    expect(image).toBe(`${environment.apiUrl}/uploads/campaigns/glowskin-hero.jpg`);
  });

  it('should report no image when a campaign has no files (the card shows its initial)', () => {
    expect(component.hasImage(mockCampaigns[1])).toBe(false);
    expect(component.campaignImage(mockCampaigns[1])).toBe('');
  });

  it('should keep assignments with unexpected statuses visible in the Influencers tab', () => {
    const mystery = {
      id: 999,
      status: 'Pending',
      user: { id: 999, user_name: 'mystery' },
    } as unknown as CampaignInfluencer;
    component.influencers.update((list) => [...list, mystery]);
    expect(component.rosterInfluencers().map((i) => component.displayName(i))).toContain('mystery');
    expect(component.pendingInfluencers().map((i) => component.displayName(i))).not.toContain('mystery');
  });

  it('should save an accepted invite and move it into the Influencers tab', () => {
    const invite = component.pendingInfluencers()[0];
    component.acceptInvite(invite);
    expect(rosterApi.campaignInfluencerControllerUpdate).toHaveBeenCalledWith(invite.id, {
      status: 'contracted',
    });
    expect(component.pendingInfluencers()).toHaveLength(0);
    expect(component.rosterInfluencers().map((i) => component.displayName(i))).toContain(
      component.displayName(invite),
    );
  });

  it('should put a declined invite back in the pending tab if saving fails', () => {
    const invite = component.pendingInfluencers()[0];
    rosterApi.campaignInfluencerControllerUpdate.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'nope' } })),
    );
    component.declineInvite(invite);
    expect(rosterApi.campaignInfluencerControllerUpdate).toHaveBeenCalledWith(invite.id, {
      status: 'rejected',
    });
    expect(component.pendingInfluencers().map((i) => i.id)).toContain(invite.id);
  });

  it('should map influencer posts with their latest metrics', () => {
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    expect(component.postsOf(ada)).toHaveLength(3);
    const morning = component.postsOf(ada).find((p) => p.id === 301);
    expect(morning?.latest?.views).toBe(12500);
    expect(morning?.snapshots).toBe(2);
    expect(morning?.engagement).toBe(980 + 74 + 51);
    expect(component.postTotals(ada).views).toBe(12500 + 5200);
  });

  it('should handle influencers without posts', () => {
    const emeka = component.rosterInfluencers().find((i) => component.displayName(i) === 'Emeka Nwosu')!;
    // No fabrication: rows without real posts render empty.
    expect(component.postsOf(emeka)).toHaveLength(0);
    expect(component.postTotals(emeka).views).toBe(0);
  });

  it('should expand and collapse an influencer to show their posts', () => {
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    expect(component.isInfluencerExpanded(ada)).toBe(false);
    component.toggleInfluencerPosts(ada);
    expect(component.isInfluencerExpanded(ada)).toBe(true);
    component.toggleInfluencerPosts(ada);
    expect(component.isInfluencerExpanded(ada)).toBe(false);
  });

  it('should normalize platform names to icon keys', () => {
    expect(component.platformIcon('Instagram')).toBe('instagram');
    expect(component.platformIcon('TikTok')).toBe('tiktok');
    expect(component.platformIcon('twitter')).toBe('x');
    expect(component.platformIcon('YouTube')).toBe('youtube');
    expect(component.platformIcon('something-new')).toBe('other');
  });

  it('should only allow full metrics with a profile and submitted posts', () => {
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    const emeka = component.rosterInfluencers().find((i) => component.displayName(i) === 'Emeka Nwosu')!;
    expect(component.canViewFullMetrics(ada)).toBe(true);
    expect(component.canViewFullMetrics(emeka)).toBe(false);
  });

  it('should read display data from the actual user.influencerProfile', () => {
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    expect(component.hasProfile(ada)).toBe(true);
    expect(component.profileText(ada, ['bio'])).toBe('Skincare storyteller testing honest routines.');
    expect(component.profileText(ada, ['location'])).toBe('Lagos, Nigeria');
    expect(component.profileText(ada, ['estimatedRates'])).toBe('₦40,000 per post');
    expect(component.profileText(ada, ['pastCollaborations'])).toBe('GlowSkin');
    expect(component.feeAgreedOf(ada)).toBe(120000);
  });

  it('should flag users without influencer data as profile-less', () => {
    const emeka = component.rosterInfluencers().find((i) => component.displayName(i) === 'Emeka Nwosu')!;
    expect(component.hasProfile(emeka)).toBe(false);
    expect(component.profileOf(emeka)).toBeNull();
    expect(component.profileIdOf(emeka)).toBeNull();
    expect(component.displayName(emeka)).toBe('Emeka Nwosu');
  });

  it('should resolve the influencer-profile id (not the user id) for navigation', () => {
    const zainab = component.pendingInfluencers().find((i) => component.displayName(i) === 'zainab.y')!;
    // User id 105, influencer-profile id 505: they must not be confused.
    expect(component.profileIdOf(zainab)).toBe(505);
    expect(component.feeAgreedOf(zainab)).toBe(18000);
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    expect(component.profileIdOf(ada)).toBe(501);
  });

  it('should open and close the influencer details drawer for profiled rows only', () => {
    const ada = component.rosterInfluencers().find((i) => component.displayName(i) === 'Ada Okafor')!;
    const emeka = component.rosterInfluencers().find((i) => component.displayName(i) === 'Emeka Nwosu')!;
    expect(component.drawerRow()).toBeNull();
    component.openDetails(ada);
    expect(component.drawerRow()).toBe(ada);
    component.closeDetails();
    expect(component.drawerRow()).toBeNull();
    // No profile → drawer stays shut, no actions allowed.
    component.openDetails(emeka);
    expect(component.drawerRow()).toBeNull();
  });

  it('should not expand rows without an influencer profile', () => {
    const emeka = component.rosterInfluencers().find((i) => component.displayName(i) === 'Emeka Nwosu')!;
    component.toggleInfluencerPosts(emeka);
    expect(component.isInfluencerExpanded(emeka)).toBe(false);
  });

  it('should classify applied vs invited rows for conditional actions', () => {
    const base = component.pendingInfluencers()[0];
    const applied = { ...base, status: 'Applied' } as unknown as CampaignInfluencer;
    const invited = { ...base, status: 'Invited' } as unknown as CampaignInfluencer;
    expect(component.isAppliedInvite(applied)).toBe(true);
    expect(component.isInvitedInvite(applied)).toBe(false);
    expect(component.isAppliedInvite(invited)).toBe(false);
    expect(component.isInvitedInvite(invited)).toBe(true);
  });

  it('should open the negotiation view for invited rows', () => {
    const zainab = component.pendingInfluencers().find((i) => component.displayName(i) === 'zainab.y')!;
    expect(component.statusOf(zainab)).toBe('invited');
    component.viewNegotiation(zainab);
    expect(component.drawerRow()).toBeNull();
  });

  it('should route menu view-profile to the pending metrics page', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const zainab = component.pendingInfluencers().find((i) => component.displayName(i) === 'zainab.y')!;
    component.menuViewProfile(zainab);
    expect(navigateSpy).toHaveBeenCalledWith(['/home/view-pending-influencer-metrics', 205], {
      queryParams: { campaignId: 1, influencerId: 505 },
    });
    expect(component.drawerRow()).toBeNull();
  });

  it('should route view negotiation to the negotiation widget with the influencer id', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const zainab = component.pendingInfluencers().find((i) => component.displayName(i) === 'zainab.y')!;
    component.viewNegotiation(zainab);
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/home/view-pending-influencer-metrics', 205],
      { queryParams: { campaignId: 1, influencerId: 505 }, fragment: 'negotiation' },
    );
    expect(component.drawerRow()).toBeNull();
  });
});

describe('CampaignSummary when the posts endpoint never responds', () => {
  let component: CampaignSummary;
  let fixture: ComponentFixture<CampaignSummary>;
  let store: MockStore;

  const rosterApi = {
    campaignInfluencerControllerFindByCampaign: vi.fn((campaignId: number) =>
      of(rosterEnvelopeFor(campaignId)),
    ),
  };

  // Simulates a hanging backend: never emits, never errors, never completes.
  const hangingPostsApi = {
    campaignInfluencerPostControllerFindByCampaign: vi.fn(() => NEVER),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignSummary],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        provideAppMockStore(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
            queryParamMap: of(convertToParamMap({})),
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              queryParams: {},
              fragment: null,
            },
          },
        },
        { provide: CampaignInfluencerService, useValue: rosterApi },
        { provide: CampaignInfluencerPostService, useValue: hangingPostsApi },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(selectCampaignList, mockCampaigns);
    store.overrideSelector(selectCampaignLoading, false);
    store.overrideSelector(selectCurrentUser, mockBrandUser as any);

    fixture = TestBed.createComponent(CampaignSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should render the roster instead of sticking on loading', () => {
    expect(component.influencers()).toHaveLength(5);
    expect(component.rosterInfluencers()).toHaveLength(4);
    expect(component.pendingInfluencers()).toHaveLength(1);
  });

  it('should parse hashtags from arrays, CSV and JSON strings', () => {
    expect(component.hashTagList(mockCampaigns[0] as any)).toEqual(['#GlowSkin', '#Skincare']);
    expect(component.hashTagList({ hash_tags: '#a,#b  #c' } as any)).toEqual(['#a', '#b', '#c']);
    expect(component.hashTagList({ hash_tags: '["#x", "y"]' } as any)).toEqual(['#x', '#y']);
    expect(component.hashTagList({ hash_tags: null } as any)).toEqual([]);
  });

  it('should detect campaign images and initials', () => {
    expect(component.hasImage(mockCampaigns[0])).toBe(true);
    expect(component.hasImage(mockCampaigns[1])).toBe(false);
    expect(component.campaignInitial(mockCampaigns[1])).toBe('L');
  });
});
