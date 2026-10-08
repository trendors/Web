import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { provideAppMockStore } from '../testing/mock-store';
import { logoutUser } from '../../store/auth/logout/logout.action';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let dispatch: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.setItem('token', 'tok');
    TestBed.configureTestingModule({
      providers: [
        provideAppMockStore(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  });

  afterEach(() => localStorage.clear());

  function fail(url: string, status: number) {
    http.get(url).subscribe({ error: () => {} });
    backend.expectOne(url).flush({}, { status, statusText: 'x' });
  }

  it('attaches the bearer token', () => {
    http.get('/a').subscribe();
    expect(backend.expectOne('/a').request.headers.get('Authorization')).toBe('Bearer tok');
  });

  it('logs out on 401 but not on 403', () => {
    fail('/forbidden', 403);
    expect(dispatch).not.toHaveBeenCalled();
    fail('/expired', 401);
    expect(dispatch).toHaveBeenCalledWith(logoutUser());
  });

  it('dispatches a single logout for a burst of 401s', () => {
    const urls = ['/1', '/2', '/3'];
    urls.forEach((u) => http.get(u).subscribe({ error: () => {} }));
    backend.expectOne('/1').flush({}, { status: 401, statusText: 'x' });
    localStorage.removeItem('token'); // what the logout effect does
    backend.expectOne('/2').flush({}, { status: 401, statusText: 'x' });
    backend.expectOne('/3').flush({}, { status: 401, statusText: 'x' });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('never logs out on requests that opted out of auth', () => {
    http.get('/public', { headers: { 'x-skip-auth': 'true' } }).subscribe({ error: () => {} });
    const req = backend.expectOne('/public');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('x-skip-auth')).toBe(false);
    req.flush({}, { status: 401, statusText: 'x' });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
