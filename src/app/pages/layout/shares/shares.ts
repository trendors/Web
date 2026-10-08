import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShareService } from '../../../core/services/shares/share.service';
import { ToastService } from '../../../components/toast/toast.service';
import { Store } from '@ngrx/store';
import { firstValueFrom, interval, Observable } from 'rxjs';
import { Share } from '../../../core/models/shares/shares.model';
import {
  selectFilteredShares,
  selectSharesFilter,
  selectSharesLoading,
  selectTotals,
} from '../../../store/shares/shares.selector';
import { selectCurrentUser } from '../../../store/auth/sharedState/auth.selector';
import { SharesActions } from '../../../store/shares/shares.action';
import { CommonModule, AsyncPipe, DecimalPipe, NgClass, TitleCasePipe } from '@angular/common';
import { TimeAgoPipe } from "../../../time-ago-pipe";


export interface ShareViewModel extends Share {
  timeRemaining: number;
  progressPercent: number;
  canClaim: boolean;
  countdownDisplay: string;
}

@Component({
  selector: 'app-main',
  imports: [CommonModule],
  templateUrl: './shares.html',
  styleUrl: './shares.scss',
})
export class SharesDashboard {
  private store = inject(Store);
  private shareService = inject(ShareService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  claimingShareId = signal<string | number | null>(null);

  shares$!: Observable<Share[]>;
  totals$ = this.store.select(selectTotals);
  loading$ = this.store.select(selectSharesLoading);
  filter$ = this.store.select(selectSharesFilter);
  user$!: Observable<any>;

  async loadShares() {
    const user = await firstValueFrom(this.user$);
    if (typeof user?.id !== 'number') return;
    this.store.dispatch(SharesActions.loadShares({ userId: user.id }));
  }


  /** Signal so the per-second countdown re-renders without zone.js. */
  viewModels = signal<ShareViewModel[]>([]);

  HOLD_HOURS = 24;
  private HOLD_MS = this.HOLD_HOURS * 60 * 60 * 1000;

  private rawShares: Share[] = [];


  ngOnInit(): void {
    this.shares$ = this.store.select(selectFilteredShares);

    this.user$ = this.store.select(selectCurrentUser);
    this.loadShares();

    this.shares$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((shares) => {
      this.rawShares = shares;
      this.rebuildViewModels();
    });

    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.rebuildViewModels());
  }

  private rebuildViewModels(): void {
    const now = Date.now();
    this.viewModels.set(this.rawShares.map((share) => {
      const sharedAt = new Date(share.createdAt).getTime();
      const elapsed = now - sharedAt;
      const remaining = Math.max(0, this.HOLD_MS - elapsed);
      const progress = Math.min(100, Math.round((elapsed / this.HOLD_MS) * 100));
      const canClaim = remaining === 0 && share.status === 'pending' && !share.paid;

      return {
        ...share,
        timeRemaining: Math.floor(remaining / 1000),
        progressPercent: progress,
        canClaim,
        countdownDisplay: this.formatCountdown(Math.floor(remaining / 1000)),
      };
    }));
  }

  private formatCountdown(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  claimReward(share: ShareViewModel): void {
    if (!share.canClaim) return;
    this.claimingShareId.set(share.id);
    this.shareService.claimReward(share.id).subscribe({
      next: (res) => {
        this.toast.show(res?.message || 'Claim submitted', 'success');
        this.claimingShareId.set(null);
        this.loadShares();
      },
      error: (err: any) => {
        console.error('Claim reward failed', err);
        const msg = err?.error?.message || err?.message || 'Failed to claim reward';
        this.toast.show(msg, 'error');
        this.claimingShareId.set(null);
        this.loadShares();
      }
    });
  }

  getStatusLabel(share: any): string {
    if (share.paid) return 'Claimed';
    if (share.status === 'verified') return 'Claimed';
    if (share.status === 'rejected') return 'Rejected';
    if (share.canClaim) return 'Ready to claim';
    return 'Waiting';
  }

  getSocialIcon(social: string): string {
    const map: Record<string, string> = {
      x: 'ti-brand-x',
      twitter: 'ti-brand-x',
      facebook: 'ti-brand-facebook',
      instagram: 'ti-brand-instagram',
      whatsapp: 'ti-brand-whatsapp',
    };
    return map[social?.toLowerCase()] ?? 'ti-share';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m ago`;
    return `${mins}m ago`;
  }

  get totalUnclaimed(): number {
    return this.viewModels()
      .filter((s) => !s.paid && s.status !== 'rejected')
      .reduce((sum, s) => sum + Number(s.rewardAmount), 0);
  }

  get totalEarned(): number {
    return this.viewModels()
      .filter((s) => s.paid)
      .reduce((sum, s) => sum + Number(s.rewardAmount), 0);
  }
}
