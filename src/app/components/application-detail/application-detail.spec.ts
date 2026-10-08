import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ApplicationDetail } from './application-detail';
import {
  CampaignDeliverableService,
  CampaignInfluencerPostService,
  CampaignInfluencerService,
} from '../../core/api';

describe('ApplicationDetail', () => {
  let component: ApplicationDetail;
  let fixture: ComponentFixture<ApplicationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationDetail],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            brand: 'Test Brand',
            campaignTitle: 'Test Campaign',
            tier: 'Micro',
            platform: 'Instagram',
            payout: 14000,
            appliedAt: 'Mar 1, 2026',
            status: 'pending',
          },
        },
        {
          provide: CampaignDeliverableService,
          useValue: { campaignDeliverableControllerFindByCampaign: () => of({ data: [] }) },
        },
        {
          provide: CampaignInfluencerPostService,
          useValue: { campaignInfluencerPostControllerFindByAssignment: () => of({ data: [] }) },
        },
        {
          provide: CampaignInfluencerService,
          useValue: { campaignInfluencerControllerFindOne: () => of({ data: null }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
