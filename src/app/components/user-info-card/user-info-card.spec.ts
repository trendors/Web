import { provideTestDefaults } from '../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserInfoCard } from './user-info-card';

describe('UserInfoCard', () => {
  let component: UserInfoCard;
  let fixture: ComponentFixture<UserInfoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserInfoCard],
      providers: [
        ...provideTestDefaults(),
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserInfoCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
