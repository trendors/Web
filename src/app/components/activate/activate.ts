

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, of } from 'rxjs';

type ActivateState = 'loading' | 'success' | 'expired' | 'invalid' | 'already-active';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './activate.html',
  styleUrls: ['./activate.scss'],
})
export class ActivateComponent implements OnInit {
  state: ActivateState = 'loading';
  userName = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state = 'invalid';
      return;
    }

    this.http
      .post<{ status: ActivateState; userName?: string }>(`${environment.apiUrl}/activate`, { token })
      .pipe(
        catchError((err) => {
          const code = err?.error?.code;
          if (code === 'TOKEN_EXPIRED') {
            this.state = 'expired';
          } else if (code === 'ALREADY_ACTIVE') {
            this.state = 'already-active';
          } else {
            this.state = 'invalid';
          }
          return of(null);
        })
      )
      .subscribe((res) => {
        console.log('Activation response:', res);
        if (res) {
          this.state = 'success';
          this.userName = res.userName ?? '';
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  resendLink(): void {
    this.router.navigate(['/resend-activation']);
  }
}