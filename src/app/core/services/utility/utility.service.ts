import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";



@Injectable({ providedIn: 'root' })
export class UtilService {
  private http = inject(HttpClient);
   private apiUrl = `${environment.apiUrl}/utility` 

fetchAiRewrite(data:string): Observable<any>{
   return this.http.post(`${this.apiUrl}/airewriter`, {text:data});
  }

  /** X trends for a location; defaults to Nigeria (WOEID 23424908). */
  fetchTrends(woeid = '23424908'): Observable<any> {
    return this.http.get(`${this.apiUrl}/xtrendingwords`, { params: { woeid } });
  }
}
   