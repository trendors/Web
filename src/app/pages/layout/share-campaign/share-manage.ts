import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { ShareOverview, ShareState } from '../../../core/models/share-campaign/share-campaign.model';
import { ShareCampaignApiService } from '../../../core/services/share-campaign/share-campaign.service';
import { errText } from '../package-campaign/package-format';

/** One share campaign from the brand's side: how many shares are in each stage, what was paid, and what is left. */
@Component({
  selector: 'app-share-manage',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './share-manage.html',
  styleUrl: '../package-campaign/package.shared.scss',
})
export class ShareManage implements OnInit {
  private readonly api = inject(ShareCampaignApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly o = signal<ShareOverview | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.o.set(await this.api.overview(this.id));
      this.error.set('');
    } catch (err) {
      this.error.set(errText(err, 'Could not load this campaign.'));
    } finally {
      this.loading.set(false);
    }
  }

  async stop(): Promise<void> {
    if (this.busy()) return;
    if (!window.confirm('Stop this campaign? No new shares can start. Shares already posted are still paid, and what is left in your budget returns to your wallet once they settle.')) return;
    this.busy.set(true);
    try {
      this.o.set(await this.api.close(this.id));
      this.toast.show('Campaign stopped.', 'success');
    } catch (err) {
      this.toast.show(errText(err), 'error');
    } finally {
      this.busy.set(false);
    }
  }

  stateLabel(s: ShareState): string {
    return { started: 'Waiting for post', verified: 'On hold', paid: 'Paid', released: 'Not paid', expired: 'Expired' }[s];
  }

  tone(s: ShareState): string {
    return s === 'paid' ? 'green' : s === 'released' || s === 'expired' ? 'red' : 'amber';
  }
}
