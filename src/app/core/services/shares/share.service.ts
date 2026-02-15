import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { Share } from '../../models/shares/shares.model';

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
}
