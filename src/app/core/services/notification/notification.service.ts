import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse, Notification } from '../../models/notification/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  findMyNotifications(userId: number): Observable<ApiResponse<Notification[]>> {
    return this.http.get<ApiResponse<Notification[]>>(`${this.apiUrl}/my-notifications/${userId}`);
  }

  markAsRead(notificationId: number, userId: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${this.apiUrl}/${notificationId}/read/${userId}`,
      {},
    );
  }
}
