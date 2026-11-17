import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CampaignService } from './campaign.service';

describe('CampaignService.getCampaigns', () => {
  it("asks for the signed-in brand's own campaigns, not a filter the server would ignore", () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let got: unknown[] = [];
    TestBed.inject(CampaignService).getCampaigns(25).subscribe((l) => (got = l));
    const req = http.expectOne((r) => r.url.endsWith('/campaign/mine'));
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).not.toContain('creator_id');
    req.flush({ error: false, message: 'ok', data: { list: [{ id: 1 }] } });
    expect(got).toEqual([{ id: 1 }]);
    http.verify();
  });
});
