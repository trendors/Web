import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { InfluencerMetricsComponent } from './view-influencer-metrics';
import { CampaignInfluencerPostService } from '../../../core/api';
import { postsEnvelopeForCampaign } from '../../../core/testing/campaign.fixtures';

describe('InfluencerMetricsComponent', () => {
  let component: InfluencerMetricsComponent;
  let fixture: ComponentFixture<InfluencerMetricsComponent>;

  const postsApi = {
    campaignInfluencerPostControllerFindByCampaign: vi.fn((campaignId: number) =>
      of(postsEnvelopeForCampaign(campaignId)),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfluencerMetricsComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '101' })),
            queryParamMap: of(convertToParamMap({ campaignId: '1' })),
          },
        },
        { provide: CampaignInfluencerPostService, useValue: postsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InfluencerMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch the campaign posts for the influencer', () => {
    expect(postsApi.campaignInfluencerPostControllerFindByCampaign).toHaveBeenCalledWith(1, 'body', false, {
      transferCache: false,
    });
    expect(component.loading()).toBe(false);
  });

  it('should derive the influencer header from their posts', () => {
    expect(component.header()?.name).toBe('Ada Okafor');
    expect(component.header()?.username).toBe('@ada.okafor');
    expect(component.header()?.campaign).toBe('GlowSkin Skincare Launch');
    expect(component.header()?.totalPayout).toBe(120000);
    expect(component.header()?.paid).toBe(40000);
    expect(component.header()?.pending).toBe(80000);
  });

  it('should list the influencer posts with their latest metrics', () => {
    expect(component.contents()).toHaveLength(3);
    const morning = component.contents().find((c) => c.title === 'Morning routine with GlowSkin');
    expect(morning?.views).toBe(12500);
    expect(morning?.likes).toBe(980);
    expect(morning?.status).toBe('Paid');
    expect(component.totalViews()).toBe('17.7K');
  });

  it('should compute content completion from the assignment', () => {
    expect(component.completionPercentage).toBe(67);
  });
});

describe('InfluencerMetricsComponent with no posts for the influencer', () => {
  let component: InfluencerMetricsComponent;
  let fixture: ComponentFixture<InfluencerMetricsComponent>;

  const postsApi = {
    campaignInfluencerPostControllerFindByCampaign: vi.fn((campaignId: number) =>
      of(postsEnvelopeForCampaign(campaignId)),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfluencerMetricsComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        {
          provide: ActivatedRoute,
          useValue: {
            // Emeka (104) has an assignment but no posts on campaign 1.
            paramMap: of(convertToParamMap({ id: '104' })),
            queryParamMap: of(convertToParamMap({ campaignId: '1' })),
          },
        },
        { provide: CampaignInfluencerPostService, useValue: postsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InfluencerMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should leave loading and show an empty state instead of header data', () => {
    expect(component.loading()).toBe(false);
    expect(component.header()).toBeNull();
    expect(component.contents()).toEqual([]);
    expect(component.error()).toContain('No posts found');
  });
});
