import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteNegotiate } from './invite-negotiate';

describe('InviteNegotiate', () => {
  let component: InviteNegotiate;
  let fixture: ComponentFixture<InviteNegotiate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteNegotiate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteNegotiate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
