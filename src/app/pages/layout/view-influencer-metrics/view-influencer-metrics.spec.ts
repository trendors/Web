import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InfluencerMetricsComponent } from './view-influencer-metrics';
import { CampaignInfluencerPostService, CampaignInfluencerService, PostMetricsService } from '../../../core/api';
import {
  latestMetricForPost,
  mockAssignmentActive,
  mockAssignments,
  mockPostMorningRoutine,
  postsForAssignment,
} from '../../../core/testing/campaign.fixtures';

function setup(assignmentId: number, assignmentFound = false) {
  const postsApi = {
    campaignInfluencerPostControllerFindByAssignment: vi.fn((id: number) =>
      of({ message: 'Posts fetched', error: false, data: postsForAssignment(id) }),
    ),
  };
  // No router state in tests, so the page falls back to fetching the assignment.
  const assignmentApi = {
    campaignInfluencerControllerFindOne: vi.fn((id: number) =>
      of({ data: assignmentFound ? mockAssignments.find((a) => a.id === id) ?? null : null }),
    ),
  };
  const metricsApi = {
    // Metrics already ride along on the fixture posts; the per-influencer
    // endpoint returns nothing so the embedded snapshots are what render.
    postMetricsControllerByInfluencer: vi.fn(() => of({ data: [] })),
  };

  TestBed.configureTestingModule({
    imports: [InfluencerMetricsComponent],
    providers: [
      provideRouter([]),
      provideLocationMocks(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ id: String(assignmentId) }) },
        },
      },
      { provide: CampaignInfluencerPostService, useValue: postsApi },
      { provide: CampaignInfluencerService, useValue: assignmentApi },
      { provide: PostMetricsService, useValue: metricsApi },
    ],
  });
  return { postsApi, metricsApi, assignmentApi };
}

describe('InfluencerMetricsComponent', () => {
  let component: InfluencerMetricsComponent;
  let fixture: ComponentFixture<InfluencerMetricsComponent>;
  let postsApi: ReturnType<typeof setup>['postsApi'];

  beforeEach(async () => {
    ({ postsApi } = setup(mockAssignmentActive.id!));
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(InfluencerMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch the posts for the route assignment', () => {
    expect(postsApi.campaignInfluencerPostControllerFindByAssignment).toHaveBeenCalledWith(
      mockAssignmentActive.id,
      'body',
      false,
      { transferCache: false },
    );
    expect(component.loading()).toBe(false);
  });

  it('should derive the influencer header from the assignment', () => {
    expect(component.header()?.name).toBe('Ada Okafor');
    expect(component.header()?.totalPayout).toBe(120000);
    expect(component.header()?.paid).toBe(40000);
    expect(component.header()?.pending).toBe(80000);
  });

  it('should list the assignment posts with their latest metrics', () => {
    const expected = postsForAssignment(mockAssignmentActive.id!);
    expect(component.contents()).toHaveLength(expected.length);
    const morning = component.contents().find((c) => c.postUrl === mockPostMorningRoutine.post_url);
    const latest = latestMetricForPost(mockPostMorningRoutine.id!);
    expect(morning?.views).toBe(latest?.views);
    expect(morning?.likes).toBe(latest?.likes);
    expect(morning?.status).toBe('Paid');
  });

  it('should compute content completion from the assignment', () => {
    // posts_published 2 of posts_agreed 3
    expect(component.completionPercentage()).toBe(67);
  });
});

describe('InfluencerMetricsComponent with no posts for the assignment', () => {
  it('should leave loading and show an empty state instead of header data', async () => {
    // Any fixture assignment with no submitted posts.
    const empty = mockAssignments.find((a) => postsForAssignment(a.id!).length === 0)!;
    setup(empty.id!);
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(InfluencerMetricsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(component.header()).toBeNull();
    expect(component.contents()).toEqual([]);
    expect(component.error()).toContain('No posts found');
  });
});

describe('InfluencerMetricsComponent with a known assignment but no posts', () => {
  it('should show the influencer header with an empty content table', async () => {
    const empty = mockAssignments.find((a) => postsForAssignment(a.id!).length === 0)!;
    setup(empty.id!, true);
    await TestBed.compileComponents();
    const fixture = TestBed.createComponent(InfluencerMetricsComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.header()).not.toBeNull();
    expect(component.contents()).toEqual([]);
  });
});
