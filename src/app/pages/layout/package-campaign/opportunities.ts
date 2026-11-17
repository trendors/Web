import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { Discover, DiscoverRow, MyCollab, MyWork } from '../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { errText, label, naira, tone } from './package-format';
import { ApplicationsInvites } from '../applications-invites/applications-invites';
import { PendingInvitesService } from '../../../core/services/invitation/pending-invites.service';

/** Find campaigns is its own view; My work is split by stage. */
type Tab = 'discover' | 'requests' | 'progress' | 'done';
const TABS: readonly Tab[] = ['discover', 'requests', 'progress', 'done'];

/**
 * A creator's side of campaigns. Find campaigns ranks opportunities by fit (with the
 * reason shown for any that are not open to them). My work keeps every deal on one
 * page, by stage: Requests (offers to answer, applications waiting, and older
 * campaigns' invites), In progress, and Done. Applying is not being selected, and an
 * offer is not a commitment until it is accepted.
 */
@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ApplicationsInvites],
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

  private readonly pendingInvites = inject(PendingInvitesService);
  /** Older campaigns' invites and applications; the section is hidden while there are none. */
  readonly legacyItems = signal<number | null>(null);
  /** Set by a My work link (?tab=mine): open Requests if anything is waiting, otherwise In progress. */
  private pickStage = false;
  /** Requests waiting on the creator: offers to answer and older campaigns' invites. */
  readonly toAnswer = computed(() => this.offers().length + this.pendingInvites.legacy());
  readonly onMyWork = computed(() => this.tab() !== 'discover');
  /** Each stage loads its own share of the older campaigns, so forget the last stage's count when switching. */
  private readonly resetLegacy = effect(() => { this.tab(); this.legacyItems.set(null); });

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    // A sidebar link or a notification can ask for a tab; it wins over the "open on My work if something needs you" default.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const t = q.get('tab');
      if (t === 'mine') { this.pickStage = true; this.opened = true; this.tab.set(this.stageToOpen()); }
      else if (TABS.includes(t as Tab)) { this.pickStage = false; this.tab.set(t as Tab); this.opened = true; }
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
      if (this.pickStage || (!this.opened && (this.hasRequests() || (w?.needsYou.length ?? 0) > 0))) this.tab.set(this.stageToOpen());
      this.pickStage = false;
      this.opened = true;
    } catch (e: any) {
      this.error.set(errText(e, 'Could not load opportunities.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async act(key: string, fn: () => Promise<unknown>, done: string) {
    this.busy.set(key);
    try { await fn(); this.toast.show(done, 'success'); this.pendingInvites.refresh(); await this.reload(); }
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
  work() { return this.mine().filter((c) => c.state === 'active'); }
  pending() { return this.mine().filter((c) => c.state === 'applied'); }
  done() { return this.mine().filter((c) => !['invited', 'selected', 'active', 'applied'].includes(c.state)); }
  private hasRequests() { return this.offers().length > 0 || this.pending().length > 0 || this.pendingInvites.legacy() > 0; }
  /** Which stage a My work link opens: anything waiting for an answer first. */
  private stageToOpen(): Tab { return this.hasRequests() ? 'requests' : 'progress'; }
  openOffers() { this.tab.set('requests'); }
  failedChecks(r: DiscoverRow) { return r.evaluation.checks.filter((c) => !c.passed); }
}
