import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyWork } from '../../core/models/package/package.model';
import { PackageCampaignService } from '../../core/services/package/package-campaign.service';
import { naira, timeLeft } from '../../pages/layout/package-campaign/package-format';

/** What the creator has earned from campaigns, read from the same summary as My work. */
@Component({
  selector: 'app-your-earnings',
  imports: [RouterLink],
  templateUrl: './your-earnings.html',
  styleUrls: ['./your-earnings.scss'],
})
export class YourEarnings implements OnInit {
  private readonly api = inject(PackageCampaignService);
  readonly naira = naira;
  readonly work = signal<MyWork | null>(null);

  readonly earned = computed(() => (this.work()?.earnings.basePaid ?? 0) + (this.work()?.earnings.bonusPaid ?? 0));
  readonly coming = computed(() => (this.work()?.earnings.baseComing ?? 0) + (this.work()?.earnings.bonusWaiting ?? 0));
  readonly nextCheck = computed(() => {
    const d = this.work()?.earnings.nextBonusCheck;
    return d ? timeLeft(d).replace(' left', '') : '';
  });

  async ngOnInit() {
    try { this.work.set(await this.api.myWork()); } catch { this.work.set(null); }
  }
}
