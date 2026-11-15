import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ActivateComponent } from './activate';

describe('ActivateComponent', () => {
  let component: ActivateComponent;
  let fixture: ComponentFixture<ActivateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivateComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should report an invalid link when there is no token', () => {
    expect(component.state()).toBe('invalid');
  });

  it('asks the server for a new link and shows the neutral confirmation', () => {
    const http = TestBed.inject(HttpTestingController);
    component.state.set('expired');
    component.resendEmail.set(' me@mail.com ');
    component.resend();
    const req = http.expectOne((r) => r.url.endsWith('/user/resend-verification'));
    expect(req.request.body).toEqual({ email: 'me@mail.com' });
    req.flush({ error: false });
    expect(component.resendState()).toBe('sent');
  });

  it('does nothing without an email', () => {
    const http = TestBed.inject(HttpTestingController);
    component.resend();
    http.expectNone((r) => r.url.endsWith('/user/resend-verification'));
  });
});
