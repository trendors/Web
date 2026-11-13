import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { NichesService } from './niches.service';

describe('NichesService', () => {
  let svc: NichesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(NichesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads the creator\'s niches', async () => {
    const p = svc.load();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/influncer-profile/me/niches')).flush({ niches: ['Fashion'] });
    await expect(p).resolves.toEqual(['Fashion']);
  });

  it('treats a missing list as no niches', async () => {
    const p = svc.load();
    http.expectOne((r) => r.url.endsWith('/influncer-profile/me/niches')).flush({});
    await expect(p).resolves.toEqual([]);
  });

  it('saves the whole list and returns what the server stored', async () => {
    const p = svc.save(['Fashion', 'fashion', 'Food']);
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/influncer-profile/me/niches'));
    expect(req.request.body).toEqual({ niches: ['Fashion', 'fashion', 'Food'] });
    req.flush({ niches: ['Fashion', 'Food'] });
    await expect(p).resolves.toEqual(['Fashion', 'Food']);
  });
});
