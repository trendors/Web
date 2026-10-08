import { provideTestDefaults } from '../../core/testing/test-providers';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareSheet } from './share-sheet';

describe('ShareSheet', () => {
  let component: ShareSheet;
  let fixture: ComponentFixture<ShareSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareSheet],
      providers: [
        ...provideTestDefaults(),
        { provide: MAT_BOTTOM_SHEET_DATA, useValue: { post: { id: 1, text: 'hello' } } },
        { provide: MatBottomSheetRef, useValue: { dismiss: () => {} } },
      ],
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
