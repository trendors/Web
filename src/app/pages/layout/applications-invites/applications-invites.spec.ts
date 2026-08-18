import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationsInvites } from './applications-invites';

describe('ApplicationsInvites', () => {
  let component: ApplicationsInvites;
  let fixture: ComponentFixture<ApplicationsInvites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationsInvites]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationsInvites);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
