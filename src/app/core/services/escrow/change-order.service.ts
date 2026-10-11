import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ChangeOrderLine {
  title?: string | null;
  content_type?: string | null;
  platform?: string | null;
  quantity: number;
  rate: number;
}

export interface ChangeOrder {
  id: number;
  round: number;
  proposed_by: 'brand' | 'influencer';
  status: string;
  message: string | null;
  lines: ChangeOrderLine[];
  total: number;
}

/**
 * Change orders: extra work and fee proposed on a signed deal. The other side
 * accepts or declines, and an accepted one adds posts and fee (the escrow is
 * then topped up). Hand-written because the generated client predates them.
 */
@Injectable({ providedIn: 'root' })
export class ChangeOrderService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/campaign-offer`;

  /** Open change orders (waiting for an answer) on one assignment. */
  open(assignmentId: number): Observable<ChangeOrder[]> {
    return this.http.get<{ data: any[] }>(`${this.url}/assignment/${assignmentId}`).pipe(
      map((res) =>
        (res?.data ?? [])
          .filter((o) => o?.is_amendment && o.status === 'proposed')
          .map((o) => this.toChangeOrder(o)),
      ),
      catchError(() => of([])),
    );
  }

  propose(assignmentId: number, lines: ChangeOrderLine[], message: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(this.url, {
        campaignInfluencerId: assignmentId,
        // The server replaces this with the caller's real side on the assignment.
        proposed_by: 'brand',
        is_amendment: true,
        message: message.trim() || undefined,
        lines: lines.map((l) => ({
          title: l.title || undefined,
          content_type: l.content_type || undefined,
          platform: l.platform || undefined,
          quantity: l.quantity,
          rate: l.rate,
        })),
      }),
    );
  }

  respond(offerId: number, status: 'accepted' | 'declined'): Promise<unknown> {
    return firstValueFrom(this.http.patch(`${this.url}/${offerId}/respond`, { status }));
  }

  private toChangeOrder(o: any): ChangeOrder {
    const lines: ChangeOrderLine[] = (o.lines ?? []).map((l: any) => ({
      title: l.title,
      content_type: l.content_type,
      platform: l.platform,
      quantity: Number(l.quantity) || 1,
      rate: Number(l.rate) || 0,
    }));
    return {
      id: o.id,
      round: o.round,
      proposed_by: o.proposed_by,
      status: o.status,
      message: o.message ?? null,
      lines,
      total: Math.round(lines.reduce((sum, l) => sum + l.quantity * l.rate, 0) * 100) / 100,
    };
  }
}
