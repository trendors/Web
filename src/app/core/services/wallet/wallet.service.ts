import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { environment } from "../../../../environments/environment.development";

@Injectable({
  providedIn: 'root' // <-- Tells Angular to make this available globally
})



export class WalletService {
  private http = inject(HttpClient);
  // private apiUrl = 'http://localhost:3000/wallet';
  private apiUrl = `${environment.apiUrl}/wallet`;

  createPendingTopup(data: { reference: string; amount: number; email: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/topup/initiate`, data);
  }

  getUserWallet(trendors_id: string): Observable<{ balance: number }> {
    return this.http.get<{ balance: number }>(`${this.apiUrl}/user/${trendors_id}`);
  }

  fetchBanks(searchString: string) {
    let data = {
      bank_name: searchString
    }
    return this.http.post(`${this.apiUrl}/banks`, data);
  }

  addBankAccount(data: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/api/add-bank-account`,
      data,
      {
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        }
      }
    );
  }

getAccountDetails(recipient?: string): Observable<any> {
  if (!recipient) {
    return of(null); 
  }

  return this.http.get<any>(`${this.apiUrl}/api/get-account-details/${recipient}`, {
    headers: {
      'accept': '*/*'
    }
  });
}

}