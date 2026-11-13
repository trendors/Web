import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../components/toast/toast.service';
import { NichesService } from '../../../core/services/creator/niches.service';
import { MAX_NICHES, MAX_NICHE_LENGTH, NICHE_SUGGESTIONS } from '../../../core/utils/niches';
import { errText } from '../package-campaign/package-format';

/**
 * Where a creator says what they make content about. Brands target campaigns by
 * niche, so a creator with none is never matched to a niche-targeted campaign.
 */
@Component({
  selector: 'app-niches',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './niches.html',
  styleUrl: '../package-campaign/package.shared.scss',
})
export class Niches implements OnInit {
  private readonly api = inject(NichesService);
  private readonly toast = inject(ToastService);

  /** Inside the Profile tabs the page title and back link are not needed. */
  @Input() embedded = false;

  readonly maxNiches = MAX_NICHES;
  readonly maxLength = MAX_NICHE_LENGTH;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly selected = signal<string[]>([]);
  /** What is saved on the server, to tell whether there is anything to save. */
  private readonly saved = signal<string[]>([]);
  draft = '';

  readonly suggestions = computed(() => NICHE_SUGGESTIONS.filter((n) => !this.has(n)));
  readonly dirty = computed(() => this.key(this.selected()) !== this.key(this.saved()));

  async ngOnInit() {
    try {
      const n = await this.api.load();
      this.selected.set(n);
      this.saved.set(n);
    } catch (e: any) {
      this.error.set(errText(e, 'Could not load your niches.'));
    } finally {
      this.loading.set(false);
    }
  }

  private key = (list: string[]) => list.map((n) => n.toLowerCase()).sort().join('|');
  private has(n: string) { return this.selected().some((x) => x.toLowerCase() === n.trim().toLowerCase()); }

  add(value: string) {
    const n = value.replace(/\s+/g, ' ').trim();
    if (!n) return;
    if (/[,<>]/.test(n)) { this.toast.show('A niche cannot contain commas or angle brackets.', 'error'); return; }
    if (n.length > this.maxLength) { this.toast.show(`A niche can be at most ${this.maxLength} characters.`, 'error'); return; }
    if (this.has(n)) { this.draft = ''; return; }
    if (this.selected().length >= this.maxNiches) { this.toast.show(`Choose at most ${this.maxNiches} niches.`, 'error'); return; }
    this.selected.update((l) => [...l, n]);
    this.draft = '';
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.add(this.draft); }
  }

  remove(i: number) { this.selected.update((l) => l.filter((_, x) => x !== i)); }

  async save() {
    this.add(this.draft);
    this.saving.set(true);
    try {
      const n = await this.api.save(this.selected());
      this.selected.set(n);
      this.saved.set(n);
      this.toast.show(n.length ? 'Niches saved. Campaigns that fit you will show up under Find campaigns.' : 'Niches cleared.', 'success');
    } catch (e: any) {
      this.toast.show(errText(e, 'Could not save your niches.'), 'error', 5000);
    } finally {
      this.saving.set(false);
    }
  }
}
