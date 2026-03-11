import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialVerify } from './social-verify';

describe('SocialVerify', () => {
  let component: SocialVerify;
  let fixture: ComponentFixture<SocialVerify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialVerify]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialVerify);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
