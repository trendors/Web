import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, filter } from 'rxjs';
import { CampaignInsights, CampaignInsightsService } from '../../core/services/campaign/campaign-insights.service';
import { RealtimeEvent, SocketService } from '../../socket.service';
import { compact, lineGeometry, naira, nearestIndex, PlotBox, yTicks } from './campaign-insights.charts';

type TrendMetric = 'views' | 'engagement';
type BreakdownBy = 'platform' | 'format';

const BOX: PlotBox = { width: 640, height: 240, left: 48, right: 16, top: 12, bottom: 28 };

/**
 * How a campaign is going, for the brand. Everything is calculated by the
 * server in one request; this only lays it out: headline figures, what needs
 * attention, results over time, results by platform or format, spend, and who
 * is performing. Each chart has a table twin, so no value depends on hover.
 */
@Component({
  selector: 'app-campaign-insights',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './campaign-insights.html',
  styleUrl: './campaign-insights.scss',
})
export class CampaignInsightsPanel implements OnChanges {
  private readonly api = inject(CampaignInsightsService);
  private readonly socket = inject(SocketService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) campaignId!: number;

  readonly data = signal<CampaignInsights | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  readonly metric = signal<TrendMetric>('views');
  readonly breakdownBy = signal<BreakdownBy>('platform');
  readonly trendTable = signal(false);
  readonly breakdownTable = signal(false);
  readonly hover = signal<number | null>(null);

  readonly box = BOX;
  readonly compact = compact;
  readonly naira = naira;

  constructor() {
    // Content submitted, approved or paid elsewhere: the numbers moved.
    this.socket
      .changes(RealtimeEvent.CampaignPostUpdated, RealtimeEvent.AssignmentUpdated)
      .pipe(
        filter((c) => c.campaignId != null && c.campaignId === this.campaignId),
        debounceTime(500),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.load(false));
  }

  ngOnChanges(): void {
    this.load(true);
  }

  private load(showSpinner: boolean): void {
    if (!this.campaignId) return;
    if (showSpinner) this.loading.set(true);
    this.api.get(this.campaignId).subscribe({
      next: (d) => {
        this.data.set(d);
        this.failed.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    this.load(true);
  }

  /* ------------------------------------------------------------- headline */

  readonly measured = computed(() => (this.data()?.performance.posts ?? 0) > 0);

  readonly paceLabel = computed(() => {
    switch (this.data()?.delivery.pace) {
      case 'ahead': return 'Ahead of schedule';
      case 'behind': return 'Behind schedule';
      case 'on_track': return 'On track';
      default: return '';
    }
  });

  /** "On track · 67% delivered, 57% of time used" (or just the share delivered when there is no schedule). */
  readonly deliverySub = computed(() => {
    const d = this.data();
    if (!d) return '';
    const base = `${d.delivery.percent}% delivered`;
    const time = d.schedule.timePct !== null ? `, ${d.schedule.timePct}% of time used` : '';
    return this.paceLabel() ? `${this.paceLabel()} · ${base}${time}` : `${base}${time}`;
  });

  readonly attention = computed(() => {
    const a = this.data()?.attention;
    if (!a) return [];
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    return [
      { icon: 'ti-lock-dollar', text: `${plural(a.fundingDue, 'creator is', 'creators are')} signed but not fully funded`, n: a.fundingDue },
      { icon: 'ti-alert-triangle', text: `${plural(a.disputes, 'open dispute', 'open disputes')}`, n: a.disputes },
      { icon: 'ti-eye', text: `${plural(a.awaitingReview, 'post is', 'posts are')} waiting for your review`, n: a.awaitingReview },
      { icon: 'ti-clock-exclamation', text: `${plural(a.overdue, 'post is', 'posts are')} overdue`, n: a.overdue },
      { icon: 'ti-zzz', text: `${plural(a.quiet, 'creator has', 'creators have')} delivered nothing after a week`, n: a.quiet },
    ].filter((i) => i.n > 0);
  });

  /* ---------------------------------------------------------------- trend */

  readonly trendValues = computed(() => (this.data()?.trend ?? []).map((t) => t[this.metric()]));
  readonly geometry = computed(() => lineGeometry(this.trendValues(), BOX));
  readonly yAxis = computed(() => {
    const g = this.geometry();
    const plotH = BOX.height - BOX.top - BOX.bottom;
    return yTicks(g.top).map((v) => ({ value: v, label: compact(v), y: g.baseline - (v / g.top) * plotH }));
  });
  readonly xAxis = computed(() => {
    const trend = this.data()?.trend ?? [];
    const g = this.geometry();
    if (trend.length === 0) return [];
    const picks = [...new Set([0, Math.floor((trend.length - 1) / 2), trend.length - 1])];
    return picks.map((i) => ({ date: trend[i].date, x: g.points[i].x }));
  });
  readonly hovered = computed(() => {
    const i = this.hover();
    const trend = this.data()?.trend ?? [];
    if (i === null || !trend[i]) return null;
    const p = this.geometry().points[i];
    return { ...trend[i], x: p.x, y: p.y, xPct: (p.x / BOX.width) * 100, yPct: (p.y / BOX.height) * 100, value: trend[i][this.metric()] };
  });

  setMetric(m: TrendMetric): void {
    this.metric.set(m);
  }

  pointerMove(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * BOX.width;
    const fraction = (x - BOX.left) / (BOX.width - BOX.left - BOX.right);
    this.hover.set(nearestIndex(fraction, this.data()?.trend.length ?? 0));
  }

  chartKey(event: KeyboardEvent): void {
    const count = this.data()?.trend.length ?? 0;
    if (count === 0) return;
    const current = this.hover() ?? count - 1;
    if (event.key === 'ArrowLeft') this.hover.set(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') this.hover.set(Math.min(count - 1, current + 1));
    else if (event.key === 'Escape') this.hover.set(null);
    else return;
    event.preventDefault();
  }

  /* ------------------------------------------------------------ breakdown */

  readonly breakdown = computed(() => {
    const d = this.data();
    if (!d) return [];
    const rows = this.breakdownBy() === 'platform' ? d.byPlatform : d.byFormat;
    const max = Math.max(1, ...rows.map((r) => r.views));
    return rows.map((r) => ({ ...r, pct: (r.views / max) * 100 }));
  });

  /* ---------------------------------------------------------------- spend */

  readonly spendSegments = computed(() => {
    const s = this.data()?.spend;
    if (!s) return [];
    const total = s.paidOut + s.held + s.toFund;
    const part = (v: number) => (total > 0 ? (v / total) * 100 : 0);
    return [
      { key: 'paid', label: 'Paid out', value: s.paidOut, pct: part(s.paidOut) },
      { key: 'held', label: 'Held in escrow', value: s.held, pct: part(s.held) },
      { key: 'tofund', label: 'Still to fund', value: s.toFund, pct: part(s.toFund) },
    ];
  });

  readonly rate = (v: number) => `${(Math.round(v * 1000) / 10).toString()}%`;
  readonly label = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);
}
