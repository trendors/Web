import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareSheet } from './share-sheet';

describe('ShareSheet', () => {
  let component: ShareSheet;
  let fixture: ComponentFixture<ShareSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareSheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
