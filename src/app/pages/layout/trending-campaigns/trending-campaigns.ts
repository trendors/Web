import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CampaignService } from '../../../core/api';
import { extractApiList } from '../../../core/utils/api-response';
import { platformLabel } from '../../../core/utils/platform-icon';
import { CampaignPreview } from '../../../components/campaign-preview/campaign-preview';

interface CampaignRow {
  id: number;
  name: string;
  description: string;
  platforms: string[];
  package: string;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-trending-campaigns',
  imports: [CommonModule, FormsModule],
  templateUrl: './trending-campaigns.html',
  styleUrl: './trending-campaigns.scss',
})
export class TrendingCampaigns implements OnInit, OnDestroy {
  private api = inject(CampaignService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  campaigns: CampaignRow[] = [];
  loading = false;
  error: string | null = null;
  hasMore = false;
  query = '';
  platform = '';

  private page = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load(true);
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  /** Platforms present in what's loaded so far, for the filter. */
  get platformOptions(): string[] {
    return [...new Set(this.campaigns.flatMap((c) => c.platforms))].sort();
  }

  get visible(): CampaignRow[] {
    return this.platform ? this.campaigns.filter((c) => c.platforms.includes(this.platform)) : this.campaigns;
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(true), 350);
  }

  load(reset: boolean): void {
    if (reset) {
      this.page = 0;
      this.campaigns = [];
    }
    this.loading = true;
    this.error = null;
    const search = this.query.trim() || undefined;

    this.api.campaignControllerFindAll(PAGE_SIZE, this.page, 'DESC', search, 'body', false, { transferCache: false }).subscribe({
      next: (res) => {
        const rows = (extractApiList(res) as Record<string, any>[])
          .filter((c) => !!c)
          .map((c) => ({
            id: Number(c['id']) || 0,
            name: String(c['name'] ?? 'Untitled campaign'),
            description: String(c['description'] ?? ''),
            platforms: this.parsePlatforms(c['platforms']).map(platformLabel),
            package: String(c['package'] ?? 'Free'),
          }));
        this.campaigns = reset ? rows : [...this.campaigns, ...rows];
        this.hasMore = rows.length === PAGE_SIZE;
        this.page++;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'Failed to load campaigns';
        this.cdr.detectChanges();
      },
    });
  }

  open(c: CampaignRow): void {
    this.dialog.open(CampaignPreview, { data: { id: c.id, name: c.name } });
  }

  private parsePlatforms(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p) => {
      try {
        return JSON.parse(p);
      } catch {
        return [p];
      }
    });
  }
}
