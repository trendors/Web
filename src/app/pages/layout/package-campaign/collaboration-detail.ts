import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { ContentItem, Dispute, MetricInput, OfferTerms, RewardsView, WorkflowEvent } from '../../../core/models/package/package.model';
import { PackageCampaignService } from '../../../core/services/package/package-campaign.service';
import { errText, label, naira, timeLeft, tone } from './package-format';

interface ItemForm { url: string; screenshot: string; note: string; reason: string }
const emptyMetrics = (): MetricInput => ({ views: 0, likes: 0, comments: 0, shares: 0, trending: false, evidence_url: '', note: '' });

/**
 * One collaboration, for the creator doing the work or the brand reviewing it.
 * Both read the same terms, content states and money figures from the server;
 * which buttons show depends on who is looking and on the item's state, and
 * the server refuses anything the viewer may not do.
 */
@Component({
  selector: 'app-collaboration-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './collaboration-detail.html',
  styleUrl: './package.shared.scss',
})
export class CollaborationDetail implements OnInit {
  private readonly api = inject(PackageCampaignService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly label = label;
  readonly tone = tone;
  readonly naira = naira;
  readonly timeLeft = timeLeft;

  /** When the earliest open results window closes: that is when the bonus is decided. */
  nextWindow(): string | null {
    const open = (this.rewards()?.windows ?? []).filter((w) => w.msLeft > 0).map((w) => w.endsAt).sort();
    return open[0] ?? null;
  }
  windowText(t: { measurement_hours?: number | null; measurement_days: number | null }) {
    const h = t.measurement_hours;
    if (h) return h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} hours`;
    return `${t.measurement_days} days`;
  }

  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly viewer: 'brand' | 'creator' = this.route.snapshot.queryParamMap.get('as') === 'brand' ? 'brand' : 'creator';
  readonly campaignId = Number(this.route.snapshot.queryParamMap.get('c')) || null;

  readonly loading = signal(true);
  readonly error = signal('');
  readonly busy = signal<string | null>(null);
  readonly who = signal<{ name?: string; campaign?: string; state?: string }>({});
  readonly terms = signal<OfferTerms | null>(null);
  readonly items = signal<ContentItem[]>([]);
  readonly rewards = signal<RewardsView | null>(null);
  readonly disputes = signal<Dispute[]>([]);
  readonly histories = signal<Record<number, WorkflowEvent[]>>({});
  readonly openItem = signal<number | null>(null);

  forms: Record<number, ItemForm> = {};
  metrics: Record<number, MetricInput> = {};
  stopReason = '';
  disputeFor: { itemId?: number; rewardId?: number } | null = null;
  disputeReason = '';
  disputeUrl = '';
  evidenceNote: Record<number, string> = {};

  readonly isActive = computed(() => this.who().state === 'active');
  readonly rounds = computed(() => this.terms()?.revision_rounds ?? 0);

  ngOnInit() { this.reload(); }

  fv(id: number): ItemForm { return (this.forms[id] ??= { url: '', screenshot: '', note: '', reason: '' }); }
  mv(id: number): MetricInput { return (this.metrics[id] ??= emptyMetrics()); }

  async reload() {
    try {
      const [terms, items, rewards, disputes] = await Promise.all([
        this.api.terms(this.id), this.api.content(this.id), this.api.rewards(this.id), this.api.disputes(this.id),
      ]);
      this.terms.set(terms.length ? terms[terms.length - 1].terms : null);
      this.items.set(items);
      // A creator whose work was sent back needs to see why without opening History.
      for (const it of items) if (it.state === 'revision_requested' || it.state === 'awaiting_publication') void this.loadHistory(it.id, true);
      this.rewards.set(rewards);
      this.disputes.set(disputes);
      this.error.set('');
      await this.loadWho();
    } catch (e: any) {
      this.error.set(errText(e, 'Could not load this collaboration.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadWho() {
    try {
      if (this.viewer === 'creator') {
        const row = (await this.api.mine()).find((c) => c.id === this.id);
        if (row) this.who.set({ campaign: row.campaign, state: row.state });
      } else if (this.campaignId) {
        const row = (await this.api.roster(this.campaignId)).find((c) => c.id === this.id);
        if (row) this.who.set({ name: row.name, state: row.state });
      }
    } catch { /* the header just stays generic */ }
  }

  async act(key: string, fn: () => Promise<unknown>, done: string) {
    this.busy.set(key);
    try {
      await fn();
      this.toast.show(done, 'success');
      await this.reload();
      const open = this.openItem();
      if (open) await this.loadHistory(open, true);
    } catch (e: any) {
      this.toast.show(errText(e), 'error', 5000);
    } finally {
      this.busy.set(null);
    }
  }

  /* ----------------------------------------------------------- content work */

  draft(i: ContentItem) {
    const f = this.fv(i.id);
    return this.act(`d${i.id}`, () => this.api.submitDraft(i.id, f.url.trim(), f.note.trim()), 'Sent for review.').then(() => (this.forms[i.id] = { url: '', screenshot: '', note: '', reason: '' }));
  }
  publish(i: ContentItem) {
    const f = this.fv(i.id);
    return this.act(`p${i.id}`, () => this.api.publish(i.id, f.url.trim(), f.screenshot.trim() || undefined, f.note.trim() || undefined), 'Proof sent. Trendors will verify that the post is live.');
  }
  approve(i: ContentItem) { return this.act(`a${i.id}`, () => this.api.approve(i.id), 'Content approved. The base fee is earned and is paid once the post is verified live.'); }
  revise(i: ContentItem) {
    const note = this.fv(i.id).note.trim();
    if (!note) { this.toast.show('Say what should change.', 'error'); return; }
    return this.act(`r${i.id}`, () => this.api.requestRevision(i.id, note), 'Revision requested.');
  }
  rejectItem(i: ContentItem) {
    const reason = this.fv(i.id).reason.trim();
    if (!reason) { this.toast.show('Give a reason so the creator knows why.', 'error'); return; }
    return this.act(`x${i.id}`, () => this.api.reject(i.id, reason), 'Content rejected.');
  }
  sendMetrics(i: ContentItem) {
    const m = this.mv(i.id);
    if (!m.evidence_url.trim()) { this.toast.show('Add a link or screenshot that shows these results.', 'error'); return; }
    return this.act(`m${i.id}`, () => this.api.submitMetrics(i.id, { ...m, views: +m.views || 0, likes: +m.likes || 0, comments: +m.comments || 0, shares: +m.shares || 0 }), 'Results sent. They count once a reviewer verifies them.')
      .then(() => (this.metrics[i.id] = emptyMetrics()));
  }

  async loadHistory(id: number, force = false) {
    if (!force && this.histories()[id]) return;
    try { this.histories.update((h) => ({ ...h, [id]: [] })); const ev = await this.api.contentHistory(id); this.histories.update((h) => ({ ...h, [id]: ev })); } catch { /* ignore */ }
  }
  /** The brand's latest feedback on an item that was sent back for changes. */
  lastFeedback(i: ContentItem): string | null {
    if (i.state !== 'revision_requested') return null;
    const ev = [...(this.histories()[i.id] ?? [])].reverse().find((h) => h.to_state === 'revision_requested' && h.reason);
    return ev?.reason ?? null;
  }
  /** Why the last published post was not accepted (by Trendors or the platform check), while the creator is asked to publish again. */
  lastPostRejection(i: ContentItem): string | null {
    if (i.state !== 'awaiting_publication') return null;
    const ev = [...(this.histories()[i.id] ?? [])].reverse().find((h) => h.from_state === 'published' && h.to_state === 'awaiting_publication' && h.reason);
    return ev?.reason ?? null;
  }
  toggle(id: number) {
    if (this.openItem() === id) { this.openItem.set(null); return; }
    this.openItem.set(id);
    this.loadHistory(id);
  }

  /* ------------------------------------------------------- collaboration level */

  stop() {
    const who = this.viewer === 'brand' ? 'Work already earned is paid and the rest returns to your campaign.' : 'Work already earned is paid; the rest is released.';
    if (!confirm(`Stop this collaboration? ${who}`)) return;
    return this.act('stop', () => this.api.stop(this.id, this.stopReason.trim() || undefined), 'The collaboration has been stopped.');
  }

  startDispute(target: { itemId?: number; rewardId?: number }) { this.disputeFor = target; this.disputeReason = ''; this.disputeUrl = ''; }
  sendDispute() {
    if (!this.disputeFor || !this.disputeReason.trim()) { this.toast.show('Say what the dispute is about.', 'error'); return; }
    const body = { ...this.disputeFor, reason: this.disputeReason.trim(), url: this.disputeUrl.trim() || undefined };
    return this.act('dispute', () => this.api.openDispute(body), 'Dispute opened. Only the disputed amount is held.').then(() => (this.disputeFor = null));
  }
  addEvidence(d: Dispute) {
    const note = (this.evidenceNote[d.id] ?? '').trim();
    if (!note) return;
    return this.act(`e${d.id}`, () => this.api.addDisputeEvidence(d.id, note), 'Evidence added.').then(() => (this.evidenceNote[d.id] = ''));
  }

  canDispute(i: ContentItem) { return this.isActive() && !['paid', 'disputed', 'released'].includes(i.fee_state) && i.state !== 'cancelled'; }
  hasOpenDispute(i: ContentItem) { return this.disputes().some((d) => d.content_item_id === i.id && d.status === 'open'); }
  windowLeft(i: ContentItem) { return timeLeft(i.window_ends_at); }
  /** The platform reads this post's numbers for us (X), with the latest reading if there is one. */
  reading(i: ContentItem) { return (this.rewards()?.readings ?? []).find((r) => r.itemId === i.id) ?? null; }
  itemName(i: ContentItem) { return `${i.content_type} on ${i.platform}${i.unit > 1 ? ' #' + i.unit : ''}`; }
  itemOf(id: number | null) { const i = this.items().find((x) => x.id === id); return i ? this.itemName(i) : 'a reward'; }
}
