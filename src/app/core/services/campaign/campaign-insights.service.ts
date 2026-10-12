import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InsightTotals {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  engagementRate: number;
}

export interface CampaignInsights {
  campaignId: number;
  name: string;
  status: string | null;
  schedule: { start: string | null; end: string | null; daysLeft: number | null; timePct: number | null };
  creators: { invited: number; applied: number; contracted: number; active: number; completed: number; declined: number; total: number };
  delivery: {
    agreed: number;
    delivered: number;
    approved: number;
    percent: number;
    overdue: number;
    awaitingReview: number;
    pace: 'ahead' | 'on_track' | 'behind' | null;
  };
  performance: InsightTotals;
  trend: { date: string; views: number; engagement: number }[];
  byPlatform: (InsightTotals & { key: string })[];
  byFormat: (InsightTotals & { key: string })[];
  topCreators: {
    assignmentId: number;
    userId: number;
    name: string;
    posts: number;
    views: number;
    engagement: number;
    engagementRate: number;
    cost: number;
    costPer1kViews: number | null;
  }[];
  topPosts: {
    postId: number;
    title: string;
    creator: string;
    platform: string | null;
    format: string | null;
    views: number;
    engagement: number;
    url: string | null;
  }[];
  spend: {
    agreed: number;
    funded: number;
    held: number;
    paidOut: number;
    toFund: number;
    budget: number | null;
    deliveredCost: number;
    costPer1kViews: number | null;
    costPerEngagement: number | null;
  };
  attention: { fundingDue: number; disputes: number; awaitingReview: number; overdue: number; quiet: number };
}

/** How one campaign is going, calculated on the server in a single request. */
@Injectable({ providedIn: 'root' })
export class CampaignInsightsService {
  private readonly http = inject(HttpClient);

  get(campaignId: number): Observable<CampaignInsights> {
    return this.http
      .get<{ data: CampaignInsights }>(`${environment.apiUrl}/campaign/${campaignId}/insights`)
      .pipe(map((res) => res.data));
  }
}
