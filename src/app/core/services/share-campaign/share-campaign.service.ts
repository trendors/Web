import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MyShare, MyShares, ShareOverview, ShareTerms, ShareTermsInput, SubmitResult } from '../../models/share-campaign/share-campaign.model';

/**
 * Everything the share-campaign screens call. The server decides who may do what and moves all money;
 * this only sends the request and unwraps `{ data }`.
 */
@Injectable({ providedIn: 'root' })
export class ShareCampaignApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private get<T>(path: string) {
    return firstValueFrom(this.http.get<{ data: T }>(`${this.api}${path}`).pipe(map((r) => r?.data as T)));
  }
  private post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<{ data: T }>(`${this.api}${path}`, body).pipe(map((r) => r?.data as T)));
  }

  /* ----------------------------------------------------------------- brand */

  setTerms(campaignId: number, input: ShareTermsInput) {
    return firstValueFrom(this.http.put<{ data: ShareTerms }>(`${this.api}/share-campaign/${campaignId}/terms`, input).pipe(map((r) => r?.data as ShareTerms)));
  }
  overview(campaignId: number) { return this.get<ShareOverview>(`/share-campaign/${campaignId}/shares`); }
  close(campaignId: number) { return this.post<ShareOverview>(`/share-campaign/${campaignId}/close`); }

  /* --------------------------------------------------------------- creator */

  terms(campaignId: number) { return this.get<ShareTerms>(`/share-campaign/${campaignId}/terms`); }
  mine(campaignId: number) { return this.get<MyShares>(`/share-campaign/${campaignId}/mine`); }
  start(campaignId: number) { return this.post<MyShare>(`/share-campaign/${campaignId}/shares`); }
  submit(shareId: number, url: string) { return this.post<SubmitResult>(`/share-campaign/shares/${shareId}/submit`, { url }); }
}
