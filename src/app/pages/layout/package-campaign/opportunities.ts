import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { Discover, DiscoverRow, MyCollab, MyWork } from '../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { errText, label, naira, tone } from './package-format';

type Tab = 'discover' | 'mine';

/**
 * A creator's side of package campaigns: opportunities ranked by fit (with the
 * reason shown for any that are not open to them), applications, and offers to
 * accept. Applying is not being selected, and an offer is not a commitment
 * until it is accepted.
 */
@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './opportunities.html',
  styleUrl: './package.shared.scss',
})
export class Opportunities implements OnInit {
  private readonly api = inject(PackageCampaignService);
  private readonly toast = inject(ToastService);

  readonly label = label;
  readonly tone = tone;
  readonly naira = naira;

  readonly tab = signal<Tab>('discover');
  readonly loading = signal(true);
  readonly busy = signal<string | null>(null);
  readonly error = signal('');
  readonly found = signal<Discover | null>(null);
  readonly mine = signal<MyCollab[]>([]);
  readonly showIneligible = signal(false);
  readonly work$ = signal<MyWork | null>(null);
  readonly showAllNeeds = signal(false);
  /** Set after the first load so a reload never yanks the creator off the tab they chose. */
  private opened = false;
  pitches: Record<number, string> = {};
  declineReason: Record<number, string> = {};

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    // A sidebar link or a notification can ask for a tab; it wins over the "open on My work if something needs you" default.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const t = q.get('tab');
      if (t === 'discover' || t === 'mine') { this.tab.set(t); this.opened = true; }
    });
    this.reload();
  }

  async reload() {
    try {
      const [d, m, w] = await Promise.all([this.api.discover(true), this.api.mine(), this.api.myWork().catch(() => null)]);
      this.found.set(d);
      this.mine.set(m);
      this.work$.set(w);
      this.error.set('');
      if (!this.opened && (m.some((x) => x.state === 'invited' || x.state === 'selected') || (w?.needsYou.length ?? 0) > 0)) this.tab.set('mine');
      this.opened = true;
    } catch (e: any) {
      this.error.set(errText(e, 'Could not load opportunities.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async act(key: string, fn: () => Promise<unknown>, done: string) {
    this.busy.set(key);
    try { await fn(); this.toast.show(done, 'success'); await this.reload(); }
    catch (e: any) { this.toast.show(errText(e), 'error', 5000); }
    finally { this.busy.set(null); }
  }

  apply(r: DiscoverRow) { return this.act(`ap${r.campaignId}`, () => this.api.apply(r.campaignId, (this.pitches[r.campaignId] ?? '').trim() || undefined), 'Application sent. The brand will decide; nothing is reserved yet.'); }
  accept(c: MyCollab) { return this.act(`ac${c.id}`, () => this.api.accept(c.id), 'You are in. The terms you accepted are now fixed.'); }
  decline(c: MyCollab) { return this.act(`de${c.id}`, () => this.api.decline(c.id, (this.declineReason[c.id] ?? '').trim() || undefined), 'Offer declined.'); }
  withdraw(c: MyCollab) { return this.act(`wd${c.id}`, () => this.api.withdraw(c.id), 'Application withdrawn.'); }

  needs() { const all = this.work$()?.needsYou ?? []; return this.showAllNeeds() ? all : all.slice(0, 5); }
  moreNeeds() { return Math.max(0, (this.work$()?.needsYou.length ?? 0) - 5); }
  needLink(n: { collaborationId: number; kind: string }) { return n.kind === 'offer' ? null : ['/home/collaboration', n.collaborationId]; }
  hasEarnings() { const e = this.work$()?.earnings; return !!e && (e.basePaid + e.baseComing + e.bonusPaid + e.bonusWaiting) > 0; }
  windowText(o: { measurement_hours?: number | null; measurement_days: number | null }) {
    const h = o.measurement_hours;
    if (h) return h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} hours`;
    return `${o.measurement_days} days`;
  }
  offers() { return this.mine().filter((c) => c.state === 'invited' || c.state === 'selected'); }
  work() { return this.mine().filter((c) => c.state === 'active' || c.state === 'completed'); }
  pending() { return this.mine().filter((c) => c.state === 'applied'); }
  closed() { return this.mine().filter((c) => !['invited', 'selected', 'active', 'completed', 'applied'].includes(c.state)); }
  failedChecks(r: DiscoverRow) { return r.evaluation.checks.filter((c) => !c.passed); }
}
