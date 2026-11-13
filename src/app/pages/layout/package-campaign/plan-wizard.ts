import { CommonModule, Location } from '@angular/common';
import { NICHE_SUGGESTIONS } from '../../../core/utils/niches';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import {
  BONUS_METRICS, CAMPAIGN_PLATFORMS, CONTENT_TYPES, DELIVERABLE_PLATFORMS, MILESTONE_METRICS, PACKAGE_PLATFORMS,
  Deliverable, Milestone, PackageInfo, PlanForm, PlanSummary,
} from '../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { errText, label, naira, tone } from './package-format';

const STEPS = ['Package', 'About the campaign', 'Platforms & creators', 'Review & pay'] as const;

export { NICHE_SUGGESTIONS };
export const COUNTRY_SUGGESTIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'United Kingdom', 'United States', 'Canada', 'United Arab Emirates'];
export const OBJECTIVE_CHOICES = ['Build brand awareness', 'Drive sales', 'Get app installs', 'Grow followers', 'Launch a product'];
const DEFAULT_USAGE_RIGHTS = 'The brand may repost the content on its own channels for 90 days.';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); };

const blank = (): PlanForm => ({
  name: '', product: '', description: '', objectives: '', usage_rights: DEFAULT_USAGE_RIGHTS,
  platforms: [], niches: [], creator_countries: [], audience_countries: [],
  follower_min: null, follower_max: null, package_key: '', creators_count: null, platform_priority: [],
  base_fee_budget: 0, reward_pool_budget: 0, bonus_pool_budget: 0,
  start_date: inDays(3), end_date: inDays(31),
  deliverables: [{ content_type: 'post', platform: 'instagram', quantity: 1, rate_per_post: 0 }],
  reward_milestones: [], bonus_rule: null,
});

const day = (iso: string | null | undefined) => (iso ? String(iso).slice(0, 10) : '');

/**
 * A brand building a package campaign: pick a package, describe the work, set
 * who can take part, price it, and review exactly what will be charged. The
 * server validates and prices everything; this screen only collects it.
 */
@Component({
  selector: 'app-plan-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './plan-wizard.html',
  styleUrl: './package.shared.scss',
})
export class PlanWizard implements OnInit {
  private readonly api = inject(PackageCampaignService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  readonly steps = STEPS;
  readonly campaignPlatforms = CAMPAIGN_PLATFORMS;
  readonly deliverablePlatforms = DELIVERABLE_PLATFORMS;
  readonly packagePlatforms = PACKAGE_PLATFORMS;
  /** Platforms creators can connect. Others are shown but cannot be added: nobody could be matched on them. */
  readonly connectable = signal<string[]>(['twitter']);
  /** A platform already on a saved draft can still be removed; only adding is blocked. */
  unavailableChosen() { return this.form.platforms.filter((p) => !this.connectable().includes(p)); }
  platformLocked(p: string) { return !this.connectable().includes(p) && !this.form.platforms.includes(p); }
  readonly contentTypes = CONTENT_TYPES;
  readonly milestoneMetrics = MILESTONE_METRICS;
  readonly bonusMetrics = BONUS_METRICS;
  readonly label = label;
  readonly tone = tone;
  readonly naira = naira;

  readonly step = signal(0);
  readonly packages = signal<PackageInfo[]>([]);
  readonly busy = signal<'save' | 'submit' | 'pay' | null>(null);
  readonly loading = signal(true);
  readonly campaignId = signal<number | null>(null);
  readonly summary = signal<PlanSummary | null>(null);
  readonly payStep = signal('');
  readonly problems = signal<string[]>([]);

  form: PlanForm = blank();
  readonly nicheSuggestions = NICHE_SUGGESTIONS;
  readonly countrySuggestions = COUNTRY_SUGGESTIONS;
  readonly objectiveChoices = OBJECTIVE_CHOICES;
  /** Text typed into a chip box but not yet added; added when the brand moves on so nothing typed is lost. */
  draft = { niches: '', creator_countries: '', audience_countries: '' };
  showUsage = false;
  bonusOn = false;

  // Plain methods, not computed(): `form` is a plain object, so a computed would never notice the package changing.
  chosenPackage() { return this.packages().find((p) => p.key === this.form.package_key) ?? null; }
  /** The package sets creator fees and the milestone, so the brand only picks platforms and a creator count. */
  priced() { return Number(this.chosenPackage()?.base_fee) > 0; }

  async ngOnInit() {
    try {
      this.packages.set(await this.api.packages());
      this.connectable.set(await this.api.connectablePlatforms());
      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (id) await this.load(id);
    } catch (e) {
      this.toast.show(errText(e, 'Could not load the packages.'), 'error');
    } finally {
      this.loading.set(false);
    }
  }

  private async load(id: number) {
    const s = await this.api.review(id);
    if (s.lifecycle !== 'draft') {
      this.router.navigate(['/home/plan', id], { replaceUrl: true });
      return;
    }
    this.campaignId.set(id);
    this.summary.set(s);
    this.form = {
      name: s.name, product: s.product ?? '', description: s.brief ?? '', objectives: s.objectives ?? '', usage_rights: s.usageRights ?? '',
      platforms: [...s.platformPriority.filter((p) => s.filters.platforms.includes(p)), ...s.filters.platforms.filter((p) => !s.platformPriority.includes(p))], niches: [...s.filters.niches], creator_countries: [...s.filters.creatorCountries], audience_countries: [...s.filters.audienceCountries],
      follower_min: s.filters.followerMin, follower_max: s.filters.followerMax, package_key: s.package?.key ?? '',
      creators_count: s.creators, platform_priority: [...s.platformPriority],
      base_fee_budget: s.compensation.baseFee, reward_pool_budget: s.compensation.rewardPool, bonus_pool_budget: s.compensation.campaignBonusPool,
      start_date: day(s.deadlines.start), end_date: day(s.deadlines.end),
      deliverables: s.deliverables.length ? s.deliverables.map((d) => ({ ...d })) : blank().deliverables,
      reward_milestones: s.rewards.milestones.map((m) => ({ ...m })), bonus_rule: s.rewards.campaignBonusRule ? { ...s.rewards.campaignBonusRule } : null,
    };
    this.showUsage = !!this.form.usage_rights && this.form.usage_rights !== DEFAULT_USAGE_RIGHTS;
    this.bonusOn = !!this.form.bonus_rule;
  }

  /* ------------------------------------------------------------- navigation */

  go(i: number) { this.step.set(Math.max(0, Math.min(STEPS.length - 1, i))); this.problems.set([]); }

  async next() {
    if (this.step() === 0 && !this.form.package_key) {
      this.problems.set(['Choose a package to continue.']);
      return;
    }
    if (!(await this.save())) return;
    this.go(this.step() + 1);
    if (this.step() === STEPS.length - 1) await this.refreshReview();
  }

  async openStep(i: number) {
    if (i === this.step()) return;
    if (i > this.step() && !this.form.package_key) {
      this.problems.set(['Choose a package to continue.']);
      return;
    }
    if (i > this.step() && !(await this.save())) return;
    this.go(i);
    if (i === STEPS.length - 1) await this.refreshReview();
  }

  /* ----------------------------------------------------------------- saving */

  private payload(): Partial<PlanForm> {
    const f = this.form;
    const priced = this.priced();
    const manual: Partial<PlanForm> = priced
      ? {}
      : {
          base_fee_budget: Number(f.base_fee_budget) || 0,
          reward_pool_budget: this.milestoneTotal() > 0 || Number(f.reward_pool_budget) > 0 ? Number(f.reward_pool_budget) || 0 : 0,
          bonus_pool_budget: this.bonusOn ? Number(f.bonus_pool_budget) || 0 : 0,
          bonus_rule: this.bonusOn ? f.bonus_rule : null,
          deliverables: f.deliverables.map((d) => ({ ...d, quantity: Number(d.quantity) || 0, rate_per_post: Number(d.rate_per_post) || 0 })),
          reward_milestones: f.reward_milestones.map((m, i) => ({ ...m, id: m.id || `m${i + 1}`, threshold: Number(m.threshold) || 0, amount: Number(m.amount) || 0 })),
        };
    // With a priced package the server works out deliverables, budgets and the reward from the platforms and creator count.
    const { deliverables: _d, reward_milestones: _m, bonus_rule: _b, base_fee_budget: _bf, reward_pool_budget: _rp, bonus_pool_budget: _bp, ...rest } = f;
    return {
      ...(priced ? rest : f),
      creators_count: f.creators_count === null || (f.creators_count as any) === '' ? null : Number(f.creators_count),
      platform_priority: [...f.platforms],
      start_date: f.start_date || (null as any),
      end_date: f.end_date || (null as any),
      follower_min: f.follower_min === null || (f.follower_min as any) === '' ? null : Number(f.follower_min),
      follower_max: f.follower_max === null || (f.follower_max as any) === '' ? null : Number(f.follower_max),
      ...manual,
    };
  }

  async save(): Promise<boolean> {
    this.flushDrafts();
    this.busy.set('save');
    this.problems.set([]);
    try {
      const body = this.payload();
      const id = this.campaignId();
      const s = id ? await this.api.updateDraft(id, body) : await this.api.createDraft(body);
      this.summary.set(s);
      if (!id) {
        this.campaignId.set(s.campaignId);
        // Only update the address bar. Navigating from /plan/new to /plan/:id/edit would rebuild
        // this page and send the creator back to step 1 after their first Save & continue.
        this.location.replaceState(`/home/plan/${s.campaignId}/edit`);
      }
      return true;
    } catch (e: any) {
      this.problems.set([errText(e, 'Could not save the draft.')]);
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  private async refreshReview() {
    const id = this.campaignId();
    if (id) this.summary.set(await this.api.review(id));
  }

  async saveAndExit() {
    if (await this.save()) {
      this.toast.show('Draft saved.', 'success');
      this.router.navigate(['/home/plan', this.campaignId()]);
    }
  }

  /* ------------------------------------------------------------- chip inputs */

  private chipKey = (list: 'niches' | 'creator_countries' | 'audience_countries') => list;
  addChip(list: 'niches' | 'creator_countries' | 'audience_countries', value: string) {
    const v = value.trim();
    const l = this.form[this.chipKey(list)];
    if (v && !l.some((x) => x.toLowerCase() === v.toLowerCase())) l.push(v);
    this.draft[list] = '';
  }
  removeChip(list: 'niches' | 'creator_countries' | 'audience_countries', i: number) { this.form[list].splice(i, 1); }
  onChipKey(e: KeyboardEvent, list: 'niches' | 'creator_countries' | 'audience_countries') {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this.addChip(list, this.draft[list]); }
    else if (e.key === 'Backspace' && !this.draft[list] && this.form[list].length) this.form[list].pop();
  }
  private flushDrafts() { (['niches', 'creator_countries', 'audience_countries'] as const).forEach((k) => this.draft[k].trim() && this.addChip(k, this.draft[k])); }
  addObjective(text: string) {
    const cur = this.form.objectives.trim();
    if (cur.toLowerCase().includes(text.toLowerCase())) return;
    this.form.objectives = cur ? `${cur}. ${text}` : text;
  }
  setDuration(weeks: number) {
    const start = this.form.start_date ? new Date(this.form.start_date) : new Date();
    start.setDate(start.getDate() + weeks * 7);
    this.form.end_date = isoDay(start);
  }

  /** The price so far, shown from the first step so nothing about cost is a surprise at the end. */
  priceLine(): string {
    if (!this.priced()) return '';
    const f = this.fee();
    if (this.creators() > 0 && f.posts > 0) {
      return f.extra > 0
        ? `Up to ${naira(this.escrowMax())} held · ${naira(this.baseBudget())} base fees, the rest only if creators reach the milestone`
        : `${naira(this.baseBudget())} in base fees`;
    }
    return `Base fee ${naira(f.base)} per post${f.extra > 0 ? `, up to ${naira(f.max)} with the bonus` : ''}. Choose platforms and creators to see the total.`;
  }

  /* ---------------------------------------------------------------- package */

  pickPackage(p: PackageInfo) {
    this.form.package_key = p.key;
    if (p.min_followers != null && this.form.follower_min == null) this.form.follower_min = p.min_followers;
    if (p.max_followers != null && this.form.follower_max == null) this.form.follower_max = p.max_followers;
  }

  range(p: PackageInfo) {
    return p.max_budget == null ? `${naira(p.min_budget)}+` : `${naira(p.min_budget)} – ${naira(p.max_budget)}`;
  }

  followers(p: PackageInfo) {
    if (p.min_followers == null && p.max_followers == null) return '';
    return p.max_followers == null ? `${p.min_followers!.toLocaleString()}+ followers` : `${(p.min_followers ?? 0).toLocaleString()}–${p.max_followers.toLocaleString()} followers`;
  }

  /* ---------------------------------------------------------- lists & chips */

  toggle(list: string[], v: string) { const i = list.indexOf(v); i >= 0 ? list.splice(i, 1) : list.push(v); }

  addDeliverable() { this.form.deliverables.push({ content_type: 'post', platform: 'instagram', quantity: 1, rate_per_post: 0 }); }
  removeDeliverable(i: number) { this.form.deliverables.splice(i, 1); }
  addMilestone() {
    const n = this.form.reward_milestones.length + 1;
    this.form.reward_milestones.push({ id: `m${n}`, metric: 'views', threshold: 1000 * n, amount: 0 });
  }
  removeMilestone(i: number) { this.form.reward_milestones.splice(i, 1); }
  setBonus(on: boolean) {
    this.bonusOn = on;
    if (on && !this.form.bonus_rule) this.form.bonus_rule = { metric: 'views', threshold: 10000, split: 'proportional' };
  }
  isTrending(m: Milestone) { return m.metric === 'trending'; }

  /* ------------------------------------------------- priced package platforms */

  platformName(p: string) { return p === 'twitter' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1); }
  togglePlatform(p: string) { this.toggle(this.form.platforms, p); }
  priority(p: string) { return this.form.platforms.indexOf(p) + 1; }
  movePlatform(i: number, by: -1 | 1) {
    const l = this.form.platforms, j = i + by;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
  }
  /** What one creator earns per post and in total, straight from the package. */
  fee() {
    const p = this.chosenPackage();
    const base = Number(p?.base_fee) || 0, max = Number(p?.max_fee ?? p?.base_fee) || 0, n = this.form.platforms.length;
    return { base, max, extra: Math.max(0, max - base), posts: n, baseTotal: base * n, maxTotal: max * n, extraTotal: Math.max(0, max - base) * n };
  }
  creators() { return Math.max(0, Math.floor(Number(this.form.creators_count) || 0)); }
  escrowMax() { return this.fee().maxTotal * this.creators(); }
  baseBudget() { return this.fee().baseTotal * this.creators(); }
  extraBudget() { return this.fee().extraTotal * this.creators(); }
  /** The package's tiers, or its single milestone as one tier worth all of the extra. */
  tiers(): { metric: string; threshold: number; share: number }[] {
    const p = this.chosenPackage();
    if (p?.milestone_tiers?.length) return p.milestone_tiers;
    return p?.milestone_metric ? [{ metric: p.milestone_metric, threshold: Number(p.milestone_threshold) || 1, share: 100 }] : [];
  }
  tierText(t: { metric: string; threshold: number }) { return t.metric === 'trending' ? 'the post trends' : `${Number(t.threshold).toLocaleString()} ${t.metric}`; }
  /** What each tier adds for one creator, so the brand sees where the extra goes. */
  tierRows() {
    const extra = this.fee().extraTotal;
    return this.tiers().map((t) => ({ label: t.metric === 'trending' ? 'The post trends' : `${Number(t.threshold).toLocaleString()} ${t.metric}`, amount: Math.round(extra * t.share) / 100 }));
  }
  milestoneText() {
    const t = this.tiers();
    if (!t.length) return '';
    if (t.length === 1) return t[0].metric === 'trending' ? 'the post trends' : `the post reaches ${Number(t[0].threshold).toLocaleString()} ${t[0].metric}`;
    return `the post reaches ${t.map((x) => this.tierText(x)).join(', then ')}`;
  }
  delayText() {
    const h = this.chosenPackage()?.bonus_delay_hours;
    if (!h) return '';
    return h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} hours`;
  }

  /* ------------------------------------------------------------ what fits */

  perCreatorBase() { return this.form.deliverables.reduce((t, d: Deliverable) => t + (Number(d.quantity) || 0) * (Number(d.rate_per_post) || 0), 0); }
  milestoneTotal() { return this.form.reward_milestones.reduce((t, m) => t + (Number(m.amount) || 0), 0); }
  creatorsByBase() { const p = this.perCreatorBase(); return p > 0 ? Math.floor((Number(this.form.base_fee_budget) || 0) / p) : 0; }
  creatorsByReward() { const p = this.milestoneTotal(); return p > 0 ? Math.floor((Number(this.form.reward_pool_budget) || 0) / p) : 0; }
  creatorBudget() { if (this.priced()) return this.escrowMax(); return (Number(this.form.base_fee_budget) || 0) + (Number(this.form.reward_pool_budget) || 0) + (this.bonusOn ? Number(this.form.bonus_pool_budget) || 0 : 0); }

  /** A budget outside the package's range: allowed only if Trendors has switched that on, and then reviewed by a person. */
  outsideRange() {
    const p = this.chosenPackage();
    if (!p) return false;
    const t = this.creatorBudget();
    return t < Number(p.min_budget) || (p.max_budget != null && t > Number(p.max_budget));
  }

  /* ----------------------------------------------------------------- submit */

  async submit() {
    const id = this.campaignId();
    if (!id) return;
    this.busy.set('submit');
    this.problems.set([]);
    try {
      this.summary.set(await this.api.submit(id));
    } catch (e: any) {
      const list: string[] | undefined = e?.error?.errors;
      this.problems.set(list?.length ? list : [errText(e, 'Could not submit the campaign.')]);
    } finally {
      this.busy.set(null);
    }
  }

  async pay() {
    const id = this.campaignId();
    if (!id) return;
    this.busy.set('pay');
    try {
      const outcome = await this.api.pay(id, (s) => this.payStep.set(s === 'starting' ? 'Starting payment…' : s === 'card' ? 'Waiting for your card payment…' : 'Confirming payment…'));
      if (outcome === 'paid') {
        this.toast.show('Payment received. Your campaign is live.', 'success');
        this.router.navigate(['/home/plan', id]);
      } else if (outcome === 'pending') {
        this.toast.show('Your payment is being confirmed. We will notify you when the campaign is live.', 'info', 6000);
        this.router.navigate(['/home/plan', id]);
      }
    } catch (e: any) {
      this.toast.show(errText(e, 'The payment could not be started.'), 'error');
    } finally {
      this.busy.set(null);
      this.payStep.set('');
    }
  }
}
