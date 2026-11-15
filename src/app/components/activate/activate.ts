import { Component, OnInit, inject, signal } from '@angular/core';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  // Signals so the zoneless view updates when the HTTP response lands.
  state = signal<ActivateState>('loading');
  userName = signal('');
  resendEmail = signal('');
  resendState = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('invalid');
      return;
    }

    this.http
      .post<{ status: ActivateState; userName?: string }>(`${environment.apiUrl}/activate`, { token })
      .pipe(
        catchError((err) => {
          const code = err?.error?.code;
          if (code === 'TOKEN_EXPIRED') {
            this.state.set('expired');
          } else if (code === 'ALREADY_ACTIVE') {
            this.state.set('already-active');
          } else {
            this.state.set('invalid');
          }
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.state.set('success');
          this.userName.set(res.userName ?? '');
        }
      });
  }

  /** Ask for a new activation link. The server answers the same whether or not the account exists. */
  resend(): void {
    const email = this.resendEmail().trim();
    if (!email || this.resendState() === 'sending') return;
    this.resendState.set('sending');
    this.http.post(`${environment.apiUrl}/user/resend-verification`, { email }).subscribe({
      next: () => this.resendState.set('sent'),
      error: () => this.resendState.set('error'),
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
