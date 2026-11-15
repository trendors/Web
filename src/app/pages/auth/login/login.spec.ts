import { provideTestDefaults } from '../../../core/testing/test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MockStore } from '@ngrx/store/testing';

import { Login } from './login';
import { LoginActions } from '../../../store/auth/login/login.actions';
import { authReducer, initiaState } from '../../../store/auth/sharedState/auth.reducer';
import { selectAuthError, selectAuthErrorCode } from '../../../store/auth/sharedState/auth.selector';
import { environment } from '../../../../environments/environment';

const NOT_VERIFIED = 'Please verify your email before signing in. We sent you a link when you signed up.';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let store: MockStore;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [...provideTestDefaults()],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const failWith = (error: string | null, code: string | null = null) => {
    store.overrideSelector(selectAuthError, error);
    store.overrideSelector(selectAuthErrorCode, code);
    store.refreshState();
    fixture.detectChanges();
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const resendButton = () => Array.from(el().querySelectorAll('button')).find((b) => /Resend verification email|Sending/.test(b.textContent ?? '')) as HTMLButtonElement | undefined;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when the account is not verified', () => {
    beforeEach(() => {
      component.loginForm.patchValue({ email: ' ada@mail.com ', password: 'x' });
      failWith(NOT_VERIFIED, 'EMAIL_NOT_VERIFIED');
    });

    it('tells the person why they cannot sign in, and offers a new link', () => {
      expect(el().querySelector('.ui-alert')?.textContent).toContain('verify your email');
      expect(resendButton()).toBeDefined();
    });

    it('sends the link to the address they typed, trimmed', () => {
      resendButton()!.click();
      const req = http.expectOne(`${environment.apiUrl}/user/resend-verification`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'ada@mail.com' });
      req.flush({});
    });

    it('then says the link is on its way, and drops the button', () => {
      resendButton()!.click();
      http.expectOne(`${environment.apiUrl}/user/resend-verification`).flush({});
      fixture.detectChanges();
      expect(el().textContent).toContain('We have sent a new link');
      expect(resendButton()).toBeUndefined();
    });

    it('shows a retry hint when sending fails, and keeps the button', () => {
      resendButton()!.click();
      http.expectOne(`${environment.apiUrl}/user/resend-verification`).flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(el().textContent).toContain('Could not send it just now');
      expect(resendButton()).toBeDefined();
    });

    it('does not send a second request while one is in flight', () => {
      resendButton()!.click();
      component.resend();
      http.expectOne(`${environment.apiUrl}/user/resend-verification`).flush({});
      http.verify();
    });

    it('sends nothing when no address has been typed', () => {
      component.loginForm.patchValue({ email: '  ' });
      component.resend();
      http.expectNone(`${environment.apiUrl}/user/resend-verification`);
    });
  });

  it('shows no resend button for an ordinary failure like a wrong password', () => {
    failWith('Invalid email or password.');
    expect(el().querySelector('.ui-alert')?.textContent).toContain('Invalid email or password.');
    expect(resendButton()).toBeUndefined();
  });

  it('shows no resend button when nothing has gone wrong', () => {
    failWith(null, null);
    expect(el().querySelector('.ui-alert')).toBeNull();
    expect(resendButton()).toBeUndefined();
  });

  it('clears an earlier "sending" state when they try to sign in again', () => {
    component.resendState.set('sent');
    component.loginForm.patchValue({ email: 'ada@mail.com', password: 'secret' });
    const dispatch = vi.spyOn(store, 'dispatch');
    component.onSubmit();
    expect(component.resendState()).toBe('idle');
    expect(dispatch).toHaveBeenCalledWith(LoginActions.loginRequest({ email: 'ada@mail.com', password: 'secret' }));
  });

  describe('the sign-in state', () => {
    const fail = (error: string, code?: string) => authReducer(initiaState, LoginActions.loginFailure({ error, code }));

    it('keeps the reason code with the error', () => {
      expect(fail(NOT_VERIFIED, 'EMAIL_NOT_VERIFIED')).toMatchObject({ error: NOT_VERIFIED, errorCode: 'EMAIL_NOT_VERIFIED' });
    });

    it('has no code for an ordinary failure', () => {
      expect(fail('Invalid email or password.').errorCode).toBeNull();
    });

    it('forgets the code when they try again', () => {
      const next = authReducer(fail(NOT_VERIFIED, 'EMAIL_NOT_VERIFIED'), LoginActions.loginRequest({ email: 'a@b.co', password: 'x' }));
      expect(next).toMatchObject({ error: null, errorCode: null });
    });

    it('only exposes a code while there is an error', () => {
      expect(selectAuthErrorCode.projector({ ...initiaState, error: null, errorCode: 'EMAIL_NOT_VERIFIED' })).toBeNull();
      expect(selectAuthErrorCode.projector({ ...initiaState, error: 'x', errorCode: 'EMAIL_NOT_VERIFIED' })).toBe('EMAIL_NOT_VERIFIED');
    });
  });
});
