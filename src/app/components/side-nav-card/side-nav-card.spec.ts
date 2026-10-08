import { provideTestDefaults } from '../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideNavCard } from './side-nav-card';

describe('SideNavCard', () => {
  let component: SideNavCard;
  let fixture: ComponentFixture<SideNavCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideNavCard],
      providers: [
        ...provideTestDefaults(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SideNavCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
