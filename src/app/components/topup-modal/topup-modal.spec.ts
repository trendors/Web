import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMockStore } from '@ngrx/store/testing';

import { TopupModalComponent } from './topup-modal';

describe('TopupModalComponent', () => {
  let component: TopupModalComponent;
  let fixture: ComponentFixture<TopupModalComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopupModalComponent],
      providers: [provideHttpClient(), provideMockStore()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose quick amounts without any entered amount', () => {
    expect(component.presets).toEqual([1_000, 2_000, 5_000, 10_000, 20_000, 50_000]);
    expect(component.selectedPreset()).toBeNull();
    expect(component.finalAmount).toBe(0);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.preset-btn');
    expect(buttons.length).toBe(6);
  });

  it('should select a preset and clear the custom amount', () => {
    component.customAmount = '1234';
    component.selectPreset(5_000);
    expect(component.selectedPreset()).toBe(5_000);
    expect(component.customAmount).toBe('');
    expect(component.finalAmount).toBe(5_000);
    expect(component.isValid).toBe(true);
  });

  it('should clear the preset when a custom amount is typed', () => {
    component.selectPreset(2_000);
    component.customAmount = '7500';
    component.onCustomInput();
    expect(component.selectedPreset()).toBeNull();
    expect(component.finalAmount).toBe(7_500);
  });

  it('should reject amounts below the ₦100 minimum', () => {
    component.customAmount = '50';
    component.onCustomInput();
    expect(component.isValid).toBe(false);
  });
});
