import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../../../environments/environment';

describe('AuthService.login failures', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const fail = (body: object, status: number) => {
    let caught: any;
    service.login('ada@mail.com', 'pw').subscribe({ error: (e) => (caught = e) });
    http.expectOne(`${environment.apiUrl}/user/login`).flush(body, { status, statusText: 'x' });
    return caught;
  };

  it("passes on the server's reason and its code, so the screen can offer the right next step", () => {
    const e = fail({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before signing in.' }, 403);
    expect(e.message).toBe('Please verify your email before signing in.');
    expect(e.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('has no code for an ordinary failure', () => {
    const e = fail({ message: 'Invalid email or password.' }, 401);
    expect(e.message).toBe('Invalid email or password.');
    expect(e.code).toBeUndefined();
  });

  it('still reads the first message when the server sends a list', () => {
    expect(fail({ message: ['email must be an email', 'x'] }, 400).message).toBe('email must be an email');
  });
});
