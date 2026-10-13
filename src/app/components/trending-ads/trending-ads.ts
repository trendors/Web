import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CampaignPreview } from '../campaign-preview/campaign-preview';
import { CampaignService } from '../../core/api';
import { extractApiList } from '../../core/utils/api-response';
import { platformIconKey, platformLabel } from '../../core/utils/platform-icon';

export interface TrendingCampaign {
  id: number;
  name: string;
  platform: string;
  platformIcon: string;
  package: string;
}

@Component({
  selector: 'app-trending-ads',
  imports: [CommonModule, RouterLink],
  templateUrl: './trending-ads.html',
  styleUrl: './trending-ads.scss',
})
export class TrendingAds implements OnInit {
  private campaignApi = inject(CampaignService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);

  campaigns: TrendingCampaign[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.fetchCampaigns();
  }

  openCampaign(campaign: TrendingCampaign): void {
    this.dialog.open(CampaignPreview, { data: { id: campaign.id, name: campaign.name } });
  }

  fetchCampaigns(): void {
    this.loading = true;
    this.error = null;

    this.campaignApi.campaignControllerFindAll(5, 0, 'DESC', undefined, 'body', false, { transferCache: false }).subscribe({
      next: (res) => {
        this.loading = false;
        this.campaigns = (extractApiList(res) as Record<string, any>[])
          .filter((c) => !!c)
          .map((c) => {
            const platforms = this.parsePlatforms(c['platforms']);
            const platform = platforms[0] ?? '';
            return {
              id: Number(c['id']) || 0,
              name: String(c['name'] ?? 'Untitled campaign'),
              platform: platformLabel(platform),
              platformIcon: platformIconKey(platform),
              package: String(c['package'] ?? 'Free'),
            };
          });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'Failed to load trending campaigns';
        this.cdr.detectChanges();
      },
    });
  }

  /** Platforms arrive as e.g. ["[\"twitter\"]"] — unwrap the nested JSON string. */
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
