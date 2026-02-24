import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { Campaign } from '../../models/campaign/campaign.model';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/campaign`;

  getCampaigns(userId: string | number): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.apiUrl}?creator_id=${userId}`);
  }
}
