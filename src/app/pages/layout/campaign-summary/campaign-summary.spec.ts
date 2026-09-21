import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, firstValueFrom, NEVER } from 'rxjs';
import { vi } from 'vitest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { CampaignSummary } from './campaign-summary';
import type { CampaignInfluencerRow } from './campaign-summary';
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
        provideMockStore(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
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
    expect(rosterApi.campaignInfluencerControllerFindByCampaign).toHaveBeenCalledWith(1, true);
    expect(component.influencers()).toHaveLength(5);
  });

  it('should populate posts and metrics from the posts endpoint', () => {
    expect(postsApi.campaignInfluencerPostControllerFindByCampaign).toHaveBeenCalledWith(1);
    const ada = component.rosterInfluencers().find((i) => i.name === 'Ada Okafor');
    expect(ada?.posts).toHaveLength(3);
    expect(ada?.posts.find((p) => p.id === 301)?.latest?.views).toBe(12500);
  });

  it('should keep invited assignments out of the Influencers tab', () => {
    expect(component.rosterInfluencers()).toHaveLength(4);
    expect(component.rosterInfluencers().map((i) => i.status)).not.toContain('Invited');
    expect(component.pendingInfluencers().map((i) => i.name)).toEqual(['zainab.y']);
  });

  it('should derive influencer stats from the live roster', () => {
    expect(component.influencerStats()).toEqual({ total: 5, active: 2, completed: 1, cancelled: 1 });
  });

  it('should resolve a relative campaign file against the API base URL', () => {
    const image = component.campaignImage(mockCampaigns[0]);
    expect(image).toBe(`${environment.apiUrl}/uploads/campaigns/glowskin-hero.jpg`);
  });

  it('should fall back to the placeholder image when a campaign has no files', () => {
    expect(component.campaignImage(mockCampaigns[1])).toBe(component.FALLBACK_IMAGE);
  });

  it('should keep assignments with unexpected statuses visible in the Influencers tab', () => {
    const mystery: CampaignInfluencerRow = {
      assignmentId: 999,
      influencerId: 999,
      name: 'Mystery Creator',
      handle: '@mystery',
      avatar: '',
      platform: '—',
      status: 'Pending',
      statusClass: 'amber',
      done: 0,
      total: 0,
      posts: [],
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    };
    component.influencers.update((list) => [...list, mystery]);
    expect(component.rosterInfluencers().map((i) => i.name)).toContain('Mystery Creator');
    expect(component.pendingInfluencers().map((i) => i.name)).not.toContain('Mystery Creator');
  });

  it('should move an accepted invite into the Influencers tab', () => {
    const invite = component.pendingInfluencers()[0];
    component.acceptInvite(invite);
    expect(component.pendingInfluencers()).toHaveLength(0);
    expect(component.rosterInfluencers().map((i) => i.name)).toContain(invite.name);
  });

  it('should map influencer posts with their latest metrics', () => {
    const ada = component.rosterInfluencers().find((i) => i.name === 'Ada Okafor');
    expect(ada?.posts).toHaveLength(3);
    const morning = ada?.posts.find((p) => p.id === 301);
    expect(morning?.latest?.views).toBe(12500);
    expect(morning?.snapshots).toBe(2);
    expect(morning?.engagement).toBe(980 + 74 + 51);
    expect(ada?.totalViews).toBe(12500 + 5200);
  });

  it('should handle influencers without posts', () => {
    const emeka = component.rosterInfluencers().find((i) => i.name === 'Emeka Nwosu');
    expect(emeka?.posts).toEqual([]);
    expect(emeka?.totalViews).toBe(0);
  });

  it('should expand and collapse an influencer to show their posts', () => {
    const ada = component.rosterInfluencers().find((i) => i.name === 'Ada Okafor')!;
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

  it('should only allow full metrics once an influencer has submitted posts', () => {
    const ada = component.rosterInfluencers().find((i) => i.name === 'Ada Okafor')!;
    const emeka = component.rosterInfluencers().find((i) => i.name === 'Emeka Nwosu')!;
    expect(component.canViewFullMetrics(ada)).toBe(true);
    expect(component.canViewFullMetrics(emeka)).toBe(false);
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
        provideMockStore(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
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
});
