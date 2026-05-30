import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse, Notification } from '../../models/notification/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  findMyNotifications(trendorId: string): Observable<ApiResponse<Notification[]>> {
    return this.http.get<ApiResponse<Notification[]>>(`${this.apiUrl}/my-notifications/${trendorId}`);
  }

  markAsRead(notificationId: number, trendorId: string): Observable<ApiResponse<null>> {
    console.log(`Marking notification ${notificationId} as read for trendor ${trendorId}`);
    return this.http.patch<ApiResponse<null>>(
      `${this.apiUrl}/${notificationId}/read/${trendorId}`,
      {},
    );
  }
}
