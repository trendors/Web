import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvitesLists } from './invites-lists';

describe('InvitesLists', () => {
  let component: InvitesLists;
  let fixture: ComponentFixture<InvitesLists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvitesLists]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvitesLists);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
