import { provideTestDefaults } from '../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';

import { YourEarnings } from './your-earnings';

describe('YourEarnings', () => {
  let component: YourEarnings;
  let fixture: ComponentFixture<YourEarnings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YourEarnings],
      providers: [
        ...provideTestDefaults(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(YourEarnings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends Withdraw to the Wallet tab of the profile page, not to a dead address', () => {
    fixture.detectChanges();
    const link = fixture.debugElement.query(By.css('.earnings__withdraw-btn')).injector.get(RouterLink);
    expect(TestBed.inject(Router).serializeUrl(link.urlTree!)).toBe('/home/profile?tab=wallet');
  });
});
