import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { ApiResponse, Campaign } from '../../models/campaign/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/campaign`;

  getCampaigns(userId: string | number): Observable<Campaign[]> {
    return this.http
      .get<ApiResponse<{ list: Campaign[] }>>(`${this.apiUrl}?creator_id=${userId}`)
      .pipe(map((res) => res.data?.list || []));
  }

  createCampaign(dto: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}`, dto);
  }

  deleteCampaign(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  updateCampaign(id: number, dto: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, dto);
  }

  findAllByCampaign(campaignId: number): Observable<Campaign[]> {
    return this.http
      .get<ApiResponse<{ list: Campaign[] }>>(`${this.apiUrl}/${campaignId}/all-inivites`)
      .pipe(map((res) => res.data?.list || []));
  }
}
