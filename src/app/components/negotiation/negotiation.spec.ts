import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Negotiation } from './negotiation';

describe('Negotiation', () => {
  let component: Negotiation;
  let fixture: ComponentFixture<Negotiation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Negotiation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Negotiation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
