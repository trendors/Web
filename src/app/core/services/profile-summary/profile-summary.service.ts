import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** What the card at the top of the page shows for the creator profile. */
export interface CreatorSummary { profile: 'creative'; available: number; earned: number; active: number; toDo: number }
/** What the card at the top of the page shows for the brand profile. */
export interface BrandSummary { profile: 'brand'; live: number; creators: number; paidOut: number; inEscrow: number }
export type ProfileSummary = CreatorSummary | BrandSummary;

/** The few real numbers for the signed-in person's active profile. The server works them out from the same records payouts use. */
@Injectable({ providedIn: 'root' })
export class ProfileSummaryService {
  private readonly http = inject(HttpClient);

  get(profile: 'brand' | 'creative'): Promise<ProfileSummary> {
    return firstValueFrom(this.http.get<{ data: ProfileSummary }>(`${environment.apiUrl}/me/summary`, { params: { profile } }).pipe(map((r) => r.data)));
  }
}
