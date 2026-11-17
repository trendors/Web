import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, input, output, signal } from '@angular/core';
import { CreatorSummary } from '../../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../../core/services/package/package-campaign.service';
import { compact, errText, label, platformName } from '../package-format';

/**
 * One creator, for one campaign: who they are, every connected account with its followers, how
 * they fit (each check, passed or not), and their record on Trendors. The brand invites from here.
 */
@Component({
  selector: 'app-creator-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creator-summary.html',
  styleUrl: './creator-summary.scss',
})
export class CreatorSummaryPanel implements OnInit {
  private readonly api = inject(PackageCampaignService);

  readonly campaignId = input.required<number>();
  readonly userId = input.required<number>();
  /** The campaign takes creators now (it is live). */
  readonly canInvite = input(true);
  /** The page is busy inviting someone. */
  readonly inviting = input(false);
  /** Already on this campaign, as the page's roster knows it (fresher than this summary after an invite). */
  readonly alreadyOnCampaign = input(false);

  readonly closed = output<void>();
  readonly invite = output<{ userId: number; name: string }>();

  readonly summary = signal<CreatorSummary | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);

  readonly compact = compact;
  readonly platformName = platformName;
  readonly label = label;

  async ngOnInit() {
    try { this.summary.set(await this.api.creatorSummary(this.campaignId(), this.userId())); }
    catch (e: any) { this.error.set(errText(e, 'Could not load this creator.')); }
    finally { this.loading.set(false); }
  }

  @HostListener('document:keydown.escape') close() { this.closed.emit(); }

  onInvite(s: CreatorSummary) { this.invite.emit({ userId: s.userId, name: s.displayName }); }

  onCampaign(s: CreatorSummary) { return this.alreadyOnCampaign() || !!s.onThisCampaign; }
}
