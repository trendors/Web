import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { Matches, MyWork, PlanSummary, RosterRow, Transition } from '../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { errText, label, naira, timeLeft, tone } from './package-format';

type Tab = 'creators' | 'find' | 'terms' | 'history' | 'report';

/**
 * One package campaign, from the brand's side: its state and payment, the
 * creators who applied or were invited, matching creators to invite, and the
 * final report once it has settled.
 */
@Component({
  selector: 'app-plan-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './plan-manage.html',
  styleUrl: './package.shared.scss',
})
export class PlanManage implements OnInit {
  private readonly api = inject(PackageCampaignService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly label = label;
  readonly tone = tone;
  readonly naira = naira;

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly s = signal<PlanSummary | null>(null);
  readonly roster = signal<RosterRow[]>([]);
  readonly matches = signal<Matches | null>(null);
  readonly history = signal<Transition[]>([]);
  readonly money = signal<MyWork['earnings'] | null>(null);
  readonly report = signal<Record<string, any> | null>(null);
  readonly tab = signal<Tab>('creators');
  readonly loading = signal(true);
  readonly busy = signal<string | null>(null);
  readonly payStep = signal('');
  readonly error = signal('');

  /** What a creator can earn above the base fee: the milestones add up to this. */
  readonly defaultAllocation = computed(() => (this.s()?.rewards.milestones ?? []).reduce((t, m) => t + Number(m.amount), 0));
  allocations: Record<number, number> = {};

  readonly applicants = computed(() => this.roster().filter((r) => r.state === 'applied'));
  readonly offers = computed(() => this.roster().filter((r) => r.state === 'invited' || r.state === 'selected'));
  readonly working = computed(() => this.roster().filter((r) => r.state === 'active' || r.state === 'completed'));
  readonly others = computed(() => this.roster().filter((r) => !['applied', 'invited', 'selected', 'active', 'completed'].includes(r.state)));
  readonly live = computed(() => ['active', 'closing', 'disputed'].includes(this.s()?.lifecycle ?? ''));

  ngOnInit() { this.reload(); }

  async reload() {
    try {
      const s = await this.api.review(this.id);
      this.s.set(s);
      this.error.set('');
      this.history.set(await this.api.history(this.id));
      if (s.lifecycle !== 'draft' && s.lifecycle !== 'cancelled') this.roster.set(await this.api.roster(this.id));
      if (['active', 'closing', 'disputed'].includes(s.lifecycle)) this.money.set(await this.api.money(this.id));
      if (s.lifecycle === 'completed') { this.report.set(await this.api.report(this.id)); }
    } catch (e: any) {
      this.error.set(errText(e, 'Could not load this campaign.'));
    } finally {
      this.loading.set(false);
    }
  }

  paidOut() { const m = this.money(); return m ? m.basePaid + m.bonusPaid : 0; }
  onTheWay() { const m = this.money(); return m ? m.baseComing + m.bonusWaiting : 0; }
  nextCheck() { const d = this.money()?.nextBonusCheck; return d ? timeLeft(d).replace(' left', '') : ''; }

  windowText(): string {
    const m = this.s()?.measurement;
    if (m?.hours) return m.hours % 24 === 0 ? `${m.hours / 24} day${m.hours === 24 ? '' : 's'}` : `${m.hours} hours`;
    return `${m?.days ?? 30} days`;
  }

  alloc(id?: number) { return (id != null && this.allocations[id] != null ? this.allocations[id] : this.defaultAllocation()); }

  private async run<T>(key: string, fn: () => Promise<T>, done?: string) {
    this.busy.set(key);
    try {
      const r = await fn();
      if (done) this.toast.show(done, 'success');
      await this.reload();
      return r;
    } catch (e: any) {
      this.toast.show(errText(e), 'error', 5000);
      return undefined;
    } finally {
      this.busy.set(null);
    }
  }

  /* ---------------------------------------------------------------- money */

  async pay() {
    this.busy.set('pay');
    try {
      const outcome = await this.api.pay(this.id, (st) => this.payStep.set(st === 'starting' ? 'Starting payment…' : st === 'card' ? 'Waiting for your card payment…' : 'Confirming payment…'));
      if (outcome === 'paid') this.toast.show('Payment received. Your campaign is live.', 'success');
      else if (outcome === 'pending') this.toast.show('Your payment is being confirmed. We will notify you when the campaign is live.', 'info', 6000);
      await this.reload();
    } catch (e: any) {
      this.toast.show(errText(e, 'The payment could not be started.'), 'error');
    } finally {
      this.busy.set(null);
      this.payStep.set('');
    }
  }

  cancel() {
    if (!confirm('Cancel this campaign? Nothing has been paid out yet, so no money moves.')) return;
    return this.run('cancel', () => this.api.cancel(this.id, 'cancelled by the brand'), 'Campaign cancelled.');
  }

  close() {
    if (!confirm('Stop taking creators and wind this campaign down? Work already earned is paid; unused money is returned to you once everything is settled.')) return;
    return this.run('close', () => this.api.close(this.id), 'The campaign is closing.');
  }

  /* ------------------------------------------------------------- creators */

  select(r: RosterRow) { return this.run(`sel${r.id}`, () => this.api.select(r.id, this.alloc(r.id)), `${r.name} has been sent an offer.`); }
  notSelected(r: RosterRow) { return this.run(`ns${r.id}`, () => this.api.notSelected(r.id), 'Marked as not selected.'); }
  cancelOffer(r: RosterRow) { return this.run(`co${r.id}`, () => this.api.cancelOffer(r.id), 'Offer withdrawn.'); }

  async openFind() {
    this.tab.set('find');
    if (this.matches()) return;
    this.busy.set('matches');
    try { this.matches.set(await this.api.matches(this.id)); }
    catch (e: any) { this.toast.show(errText(e), 'error'); }
    finally { this.busy.set(null); }
  }

  invite(userId: number, name: string) {
    return this.run(`inv${userId}`, async () => { await this.api.invite(this.id, userId, this.alloc(-1)); this.matches.set(await this.api.matches(this.id)); }, `${name} has been invited.`);
  }

  already(userId: number) { return this.roster().some((r) => r.userId === userId); }

  excluded(): { key: string; n: number }[] {
    return Object.entries(this.matches()?.excludedBy ?? {}).map(([key, n]) => ({ key: key.replace(/_/g, ' '), n }));
  }

  reportRows() {
    const r = this.report();
    if (!r) return [];
    return [
      ['Funded', r['funded']], ['Base fees paid', r['baseFeesPaid']], ['Rewards paid', r['rewardsPaid']], ['Campaign bonus paid', r['campaignBonusPaid']],
      ['Service fee charged', r['serviceFeeCharged']], ['Service fee earned', r['serviceFeeEarned']], ['Service fee returned', r['serviceFeeReturned']],
      ['Unused budget returned', r['unusedBudgetReturned']], ['Total returned to you', r['totalReturnedToBrand']],
    ] as [string, number][];
  }
}
