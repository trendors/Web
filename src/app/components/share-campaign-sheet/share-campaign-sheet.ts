import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MyShare, MyShares, ShareTerms } from '../../core/models/share-campaign/share-campaign.model';
import { ShareCampaignApiService } from '../../core/services/share-campaign/share-campaign.service';
import { UtilService } from '../../core/services/utility/utility.service';
import { errText, timeLeft } from '../../pages/layout/package-campaign/package-format';
import { ToastService } from '../toast/toast.service';

/**
 * Sharing a campaign that pays per verified share. The creator asks to share (which sets their pay aside), posts on X,
 * pastes the link to their post, and is paid after the hold if the post is still live. The server decides everything.
 */
@Component({
  selector: 'app-share-campaign-sheet',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './share-campaign-sheet.html',
  styleUrl: './share-campaign-sheet.scss',
})
export class ShareCampaignSheet implements OnInit {
  private readonly api = inject(ShareCampaignApiService);
  private readonly util = inject(UtilService);
  private readonly sheetRef = inject(MatBottomSheetRef<ShareCampaignSheet>);
  private readonly toast = inject(ToastService);
  readonly data = inject<{ post: any }>(MAT_BOTTOM_SHEET_DATA);
  private readonly baseurl = environment.baseUrl;

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly terms = signal<ShareTerms | null>(null);
  readonly mine = signal<MyShares | null>(null);
  readonly error = signal('');
  /** Why the last link was not accepted, shown until the creator tries again. */
  readonly rejection = signal('');

  readonly versions = signal<string[]>([]);
  readonly aiLoading = signal(false);
  readonly selectedText = signal<string>('');
  readonly includeAd = signal(true);
  readonly pasteUrl = signal('');

  readonly shares = computed(() => this.mine()?.shares ?? []);
  /** The share the creator has started and not yet posted. */
  readonly openShare = computed(() => this.shares().find((s) => s.state === 'started' && new Date(s.expiresAt).getTime() > Date.now()) ?? null);
  readonly used = computed(() => this.shares().filter((s) => s.state === 'verified' || s.state === 'paid').length);
  readonly maxShares = computed(() => this.mine()?.maxShares ?? 1);

  /** Why the creator cannot start another share, or null when they can. */
  readonly blocker = computed<string | null>(() => {
    const t = this.terms();
    const m = this.mine();
    if (!t || !m) return null;
    if (m.closed) return 'This campaign has closed.';
    if (this.openShare()) return null;
    if (this.used() >= m.maxShares) return m.maxShares === 1 ? 'You have already shared this campaign.' : `You have used all ${m.maxShares} shares for this campaign.`;
    if (t.remaining != null && t.remaining < t.payPerShare) return "This campaign's budget has been used up.";
    return null;
  });
  readonly canStart = computed(() => !!this.terms() && !this.openShare() && this.blocker() === null);

  get campaignId(): number { return Number(this.data.post?.campaign?.id); }
  private get postLink(): string { return `${this.baseurl}/post/${this.data.post.id}`; }

  /** The text that goes to X: the chosen words, the required hashtag, a disclosure, and the link. */
  readonly composedText = computed(() => {
    const t = this.terms();
    const parts: string[] = [(this.selectedText() || this.data.post?.text || '').trim()];
    const tag = t?.hashtag ? `#${t.hashtag}` : '';
    if (tag && !parts[0].toLowerCase().includes(tag.toLowerCase())) parts[0] = `${parts[0]} ${tag}`.trim();
    if (this.includeAd() && !/(^|\s)#ad\b/i.test(parts[0])) parts[0] = `${parts[0]} #ad`;
    return `${parts[0]}\n\nView more: ${this.postLink}`;
  });

  /** X counts a link as 23 characters whatever its length. */
  readonly length = computed(() => this.composedText().replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length);

  async ngOnInit(): Promise<void> {
    this.selectedText.set(this.data.post?.text ?? '');
    await this.refresh();
    this.loading.set(false);
    this.loadVersions();
  }

  private loadVersions(): void {
    const text = this.data.post?.text;
    if (!text) return;
    this.aiLoading.set(true);
    this.util.fetchAiRewrite(text).pipe(catchError(() => of([]))).subscribe((res: any) => {
      this.versions.set((Array.isArray(res) ? res : []).map((v: any) => String(v?.text ?? '')).filter(Boolean));
      this.aiLoading.set(false);
    });
  }

  async refresh(): Promise<void> {
    try {
      const [terms, mine] = await Promise.all([this.api.terms(this.campaignId), this.api.mine(this.campaignId)]);
      this.terms.set(terms);
      this.mine.set(mine);
      this.error.set('');
    } catch (err) {
      this.error.set(errText(err, 'Could not load this campaign.'));
    }
  }

  choose(text: string): void { this.selectedText.set(text); }

  async start(): Promise<void> {
    if (this.busy() || !this.canStart()) return;
    this.busy.set(true);
    this.rejection.set('');
    try {
      await this.api.start(this.campaignId);
      await this.refresh();
    } catch (err) {
      this.error.set(errText(err));
    } finally {
      this.busy.set(false);
    }
  }

  /** Opened straight from the click, so a pop-up blocker allows it. */
  postOnX(): void {
    const url = `https://twitter.com/intent/tweet?${new URLSearchParams({ text: this.composedText() })}`;
    const win = window.open(url, '_blank', 'width=550,height=420');
    if (!win || win.closed) this.toast.show('Allow pop-ups for this site to post.', 'error');
  }

  async submit(): Promise<void> {
    const share = this.openShare();
    const url = this.pasteUrl().trim();
    if (!share || !url || this.busy()) return;
    this.busy.set(true);
    this.rejection.set('');
    this.error.set('');
    try {
      const result = await this.api.submit(share.id, url);
      if (result.accepted) {
        this.pasteUrl.set('');
        this.toast.show(`Your post is verified. You will be paid ₦${share.pay.toLocaleString('en-NG')} if it is still live after ${result.share.holdHours} hours.`, 'success', 6000);
      } else {
        this.rejection.set(result.reason ?? 'That post could not be confirmed.');
      }
      await this.refresh();
    } catch (err) {
      this.error.set(errText(err));
    } finally {
      this.busy.set(false);
    }
  }

  left(iso: string | null): string { return timeLeft(iso); }

  label(s: MyShare): string {
    switch (s.state) {
      case 'started': return 'Waiting for your post';
      case 'verified': return 'Verified, on hold';
      case 'paid': return 'Paid';
      case 'released': return 'Not paid';
      case 'expired': return 'Expired';
    }
  }

  close(): void { this.sheetRef.dismiss(); }
}
