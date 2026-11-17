import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { ApiResponse, Campaign } from '../../models/campaign/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/campaign`;

  /**
   * The signed-in brand's own campaigns, in every state. The server takes the owner from the session;
   * the id is only what the store passes along, and is not sent.
   */
  getCampaigns(_userId?: string | number): Observable<Campaign[]> {
    return this.http
      .get<ApiResponse<{ list: Campaign[] }>>(`${this.apiUrl}/mine`)
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
}
