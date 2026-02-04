import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtomNav } from './buttom-nav';

describe('ButtomNav', () => {
  let component: ButtomNav;
  let fixture: ComponentFixture<ButtomNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtomNav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtomNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
