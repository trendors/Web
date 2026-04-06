import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import {
  FindTransactionsDto,
  Transaction,
  TransactionResponse,
} from '../../models/transactions/transaction.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/transactions`;

  findAll(data: FindTransactionsDto): Observable<TransactionResponse> {
    return this.http.post<TransactionResponse>(`${this.apiUrl}/find`, data);
  }

  findOne(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/${id}`);
  }
}
