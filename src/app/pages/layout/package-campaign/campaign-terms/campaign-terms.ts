import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TermsSummary } from '../../../../core/models/package/package.model';
import { compact, hoursText, naira, postsText } from '../package-format';

/** The terms of a package campaign, compact: pay, what to post, rewards, and timing. */
@Component({
  selector: 'app-campaign-terms',
  standalone: true,
  imports: [CommonModule],
  template: `
    @let t = terms();
    <dl class="terms">
      <div><dt>You get</dt><dd><strong>{{ naira(t.baseFee) }}</strong> for {{ postsText(t.posts) || 'the work' }}</dd></div>
      @if (t.rewards.length) {
        <div><dt>Rewards</dt><dd>
          @for (r of t.rewards; track $index) { <span class="terms__reward">+{{ naira(r.amount) }} {{ r.metric === 'trending' ? 'if your post trends' : 'at ' + compact(r.threshold) + ' ' + r.metric }}</span> }
        </dd></div>
      }
      <div><dt>Timing</dt><dd>
        @if (t.dueDate) { Post by {{ t.dueDate | date: 'MMM d' }} }@if (t.windowHours) { · results counted for {{ hoursText(t.windowHours) }} }@if (t.revisions != null) { · {{ t.revisions }} revision{{ t.revisions === 1 ? '' : 's' }} }
      </dd></div>
    </dl>
  `,
  styles: [`
    .terms { margin: 8px 0; display: grid; gap: 6px; font-size: var(--fs-secondary); }
    .terms div { display: grid; grid-template-columns: 76px 1fr; gap: 8px; align-items: baseline; }
    .terms dt { color: var(--muted); font-size: var(--fs-caption); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .terms dd { margin: 0; }
    .terms__reward { display: inline-block; margin: 0 6px 2px 0; padding: 1px 8px; border-radius: 99px; background: var(--success-soft); color: var(--success); font-weight: 600; font-size: var(--fs-caption); }
  `],
})
export class CampaignTermsPanel {
  readonly terms = input.required<TermsSummary>();
  readonly naira = naira;
  readonly compact = compact;
  readonly postsText = postsText;
  readonly hoursText = hoursText;
}
