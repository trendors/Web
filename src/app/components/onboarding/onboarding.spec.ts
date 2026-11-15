import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { UserService } from '../../core/api';
import { provideTestDefaults } from '../../core/testing/test-providers';
import { Onboarding } from './onboarding';

describe('Onboarding', () => {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;

  beforeEach(async () => {
    localStorage.removeItem('trendors_onboarding_completed');
    await TestBed.configureTestingModule({
      imports: [Onboarding],
      providers: [...provideTestDefaults()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('trendors_onboarding_completed'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sends the brand name and the contact name separately for a brand', () => {
    const spy = vi.spyOn(TestBed.inject(UserService), 'userControllerCreate').mockReturnValue(of({ error: false }) as any);
    Object.assign(component.data, { accountType: 'brand', brandName: ' Acme ', contactName: 'Jo', email: 'jo@acme.com', password: 'Password123' });
    component.saveUser().subscribe();
    expect(spy.mock.calls[0][0]).toMatchObject({ brand_name: 'Acme', first_name: 'Jo', profileType: 'brand' });
  });

  it('tells Angular to redraw when sign-up finishes, so the spinner cannot stick (no zone.js)', () => {
    vi.spyOn(TestBed.inject(UserService), 'userControllerCreate').mockReturnValue(of({ error: false }) as any);
    const mark = vi.spyOn((component as any).cdr as ChangeDetectorRef, 'markForCheck');
    Object.assign(component.data, { accountType: 'creator', firstName: 'Ada', lastName: 'O', email: 'ada@x.com', password: 'Password123' });
    (component as any).saveAndSendActivation();
    expect(component.activationSent).toBe(true);
    expect(component.isSaving).toBe(false);
    expect(mark).toHaveBeenCalled();
  });

  it('offers a way to sign in and to resend the email once the link is sent', () => {
    component.activationSent = true;
    component.data.email = 'me@mail.com';
    (component as any).cdr.markForCheck();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("I've activated, sign in");
    expect(text).toContain('Waiting for activation');
    expect(text).toContain('Resend email');
  });

  it('does not send a brand name for a creator', () => {
    const spy = vi.spyOn(TestBed.inject(UserService), 'userControllerCreate').mockReturnValue(of({ error: false }) as any);
    Object.assign(component.data, { accountType: 'creator', firstName: 'Ada', lastName: 'O', email: 'ada@x.com', password: 'Password123' });
    component.saveUser().subscribe();
    const body: any = spy.mock.calls[0][0];
    expect(body.brand_name).toBeUndefined();
    expect(body.profileType).toBe('influencer');
  });
});
