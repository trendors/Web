import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { CreateShare, Share } from '../../models/shares/shares.model';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sharing`;

  getHistory(userId: string | number): Observable<Share[]> {
    return this.http.get<Share[]>(`${this.apiUrl}/history/${userId}`);
  }

  getBalance(userId: string | number): Observable<{ userId: string; balance: number }> {
    return this.http.get<{ userId: string; balance: number }>(`${this.apiUrl}/balance/${userId}`);
  }

  createShare(data: CreateShare): Observable<{ data: Share }> {
    return this.http.post<{ data: Share }>(`${this.apiUrl}/`, data)
  }

  claimShare(shareId: string | number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/verify-tweet/${shareId}`, {});
  }

  // Attempt to claim reward for a share. Accepts optional payload (e.g. external_post_url)
  claimReward(shareId: string | number): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.get<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/verify-post/${shareId}`);
  }
}
