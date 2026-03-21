import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignSummary } from './campaign-summary';

describe('CampaignSummary', () => {
  let component: CampaignSummary;
  let fixture: ComponentFixture<CampaignSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CampaignSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
