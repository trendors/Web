import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCampaign } from './view-campaign';

describe('ViewCampaign', () => {
  let component: ViewCampaign;
  let fixture: ComponentFixture<ViewCampaign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewCampaign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewCampaign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
