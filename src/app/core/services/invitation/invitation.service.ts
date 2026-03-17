import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../../models/users/user.model';
import { Invitation } from '../../models/invitation/invitation.model';

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/invitation`;

  getMyInvitations(userId: number): Observable<Invitation[]> {
    const url = `${this.apiUrl}/all-invitations/${userId}`;
    console.log('getMyInvitations URL', url);
    return this.http.get<ApiResponse<{ list: Invitation[] }>>(url).pipe(
      map((r) => {
        console.log('API response', r);
        return r.data?.list || [];
      }),
    );
  }
}
