import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { Observable } from "rxjs";



@Injectable({ providedIn: 'root' })
export class UtilService {
  private http = inject(HttpClient);
  // private apiUrl = 'http://localhost:3000/posts';
   private apiUrl = `${environment.apiUrl}/utility` 

fetchAiRewrite(data:string): Observable<any>{
   return this.http.post(`${this.apiUrl}/airewriter`, {text:data});
  }

  fetchTrends(woeid?:string): Observable<any>{
   return this.http.get(`${this.apiUrl}/xtrendingwords?woeid=23424908`)
  }
}
   