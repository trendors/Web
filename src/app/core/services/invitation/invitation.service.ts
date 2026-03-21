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
    return this.http.get<ApiResponse<{ list: Invitation[] }>>(url).pipe(
      map((r) => {
        return r.data?.list || [];
      }),
    );
  }

  getCampaignInvites(campaignId: number): Observable<Invitation[]> {
    return this.http
      .get<ApiResponse<Invitation[]>>(`${this.apiUrl}/campaign/${campaignId}/all-invites`)
      .pipe(
        map((r) => {
          return Array.isArray(r.data) ? r.data : [];
        }),
      );
  }

  respondInvitation(invitationId: number, userId: number, status: 'Accepted' | 'Declined') {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/${invitationId}/respond/${userId}`, {
      status,
    });
  }

  revokeInvitation(invitationId: number) {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${invitationId}/revoke`);
  }
}
