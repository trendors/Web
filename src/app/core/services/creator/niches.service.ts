import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** The signed-in creator's content niches, which campaign matching reads. */
@Injectable({ providedIn: 'root' })
export class NichesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/influncer-profile/me/niches`;

  async load(): Promise<string[]> {
    const r = await firstValueFrom(this.http.get<{ niches: string[] }>(this.url));
    return r?.niches ?? [];
  }

  async save(niches: string[]): Promise<string[]> {
    const r = await firstValueFrom(this.http.put<{ niches: string[] }>(this.url, { niches }));
    return r?.niches ?? [];
  }
}
