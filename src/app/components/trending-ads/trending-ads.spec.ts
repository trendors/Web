import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrendingAds } from './trending-ads';

describe('TrendingAds', () => {
  let component: TrendingAds;
  let fixture: ComponentFixture<TrendingAds>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrendingAds]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrendingAds);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
