import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { CampaignPulse } from '../../../../core/models/package/package.model';
import { compact, naira, nairaShort, platformName } from '../package-format';

/**
 * The top of a package campaign's page: how far it has reached, how people respond, what a result
 * costs, the best post, the next milestone, and anything waiting on the brand.
 */
@Component({
  selector: 'app-campaign-pulse',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campaign-pulse.html',
  styleUrls: ['../package.shared.scss', './campaign-pulse.scss'],
})
export class CampaignPulsePanel {
  readonly pulse = input.required<CampaignPulse>();
  /** Base fees and bonuses on their way to creators. */
  readonly onTheWay = input(0);
  /** When the next bonus is decided, as "3 days". */
  readonly nextCheck = input('');
  /** Go to the tab that holds what needs the brand. */
  readonly openTab = output<'creators'>();

  readonly compact = compact;
  readonly naira = naira;
  readonly nairaShort = nairaShort;
  readonly platformName = platformName;

  readonly started = computed(() => this.pulse().posts.live > 0);

  /** Funded money split into paid, held for creators and still free, as bar widths. */
  readonly budget = computed(() => {
    const m = this.pulse().money;
    if (!m || m.funded <= 0) return null;
    const pct = (n: number) => Math.max(0, Math.min(100, (n / m.funded) * 100));
    const held = m.reserved + m.bonusPool;
    return { paid: pct(m.paidToCreators), held: pct(held), free: pct(m.available), heldAmount: held, usedPct: Math.round(pct(m.paidToCreators + held)) };
  });

  readonly needs = computed(() => {
    const n = this.pulse().needsYou;
    const out: string[] = [];
    if (n.draftsToReview) out.push(`${n.draftsToReview} draft${n.draftsToReview === 1 ? '' : 's'} to review`);
    if (n.applicants) out.push(`${n.applicants} application${n.applicants === 1 ? '' : 's'} to answer`);
    if (n.offersWaiting) out.push(`${n.offersWaiting} offer${n.offersWaiting === 1 ? '' : 's'} waiting on creators`);
    return out;
  });

  metricName(metric: string, n: number) {
    if (metric === 'views') return `${compact(n)} views`;
    if (metric === 'engagement') return `${compact(n)} engagements`;
    if (metric === 'verified_posts') return `${n} live posts`;
    return 'a trending post';
  }

  /** "2h ago", "3 days ago". */
  ago(iso: string | null) {
    if (!iso) return '';
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
    const h = Math.round(mins / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)} days ago`;
  }
}
