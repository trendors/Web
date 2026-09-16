import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { Negotiation } from '../../../components/negotiation/negotiation';

interface SocialMedia {
  platform: 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | 'X';
  followers: number;
  handle: string;
  engagement: string;
}

interface ContentItem {
  title: string;
  type: string;
  platform: string;
  date: string;
  image: string;
  payout: number;
  status: 'Paid' | 'Pending';
  views: string;
  likes: string;
  comments: string;
  shares: string;
}

@Component({
  selector: 'app-view-pending-influencer-metrics',
  imports: [CommonModule, Negotiation],
  templateUrl: './view-pending-influencer-metrics.html',
  styleUrl: './view-pending-influencer-metrics.scss',
})
export class ViewPendingInfluencerMetricsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
      private location = inject(Location);


  influencerId: number | null = null;

  influencer = {
    name: 'Maya Chen',
    username: '@maya.glows',
    campaign: 'GlowSkin Skincare Launch',
    avatar:
      'https://storage.googleapis.com/banani-avatars/avatar/female/25-35/East%20Asian/4',
    status: 'Pending',
    totalPayout: 850,
    pending: 400,
    paid: 450,
  };

  socialMedia: SocialMedia[] = [
    {
      platform: 'Instagram',
      followers: 128000,
      handle: '@maya.glows',
      engagement: '4.2%',
    },
    {
      platform: 'TikTok',
      followers: 85000,
      handle: '@maya.glows',
      engagement: '6.8%',
    },
    {
      platform: 'YouTube',
      followers: 42000,
      handle: '@MayaGlows',
      engagement: '3.5%',
    },
  ];

  contents: ContentItem[] = [
    {
      title: 'Skincare Routine',
      type: 'Reel',
      platform: 'Instagram',
      date: 'Mar 18, 2026',
      image:
        'https://storage.googleapis.com/banani-generated-images/generated-images/99d04722-27aa-4002-a4bf-a4221433cc4f.jpg',
      payout: 450,
      status: 'Paid',
      views: '12.4K',
      likes: '1.2K',
      comments: '86',
      shares: '320',
    },
    {
      title: 'GlowSkin Review',
      type: 'Reel',
      platform: 'TikTok',
      date: 'Mar 27, 2026',
      image:
        'https://storage.googleapis.com/banani-generated-images/generated-images/f810109f-062b-47cb-b55a-025076714e28.jpg',
      payout: 400,
      status: 'Pending',
      views: '18.7K',
      likes: '2.1K',
      comments: '142',
      shares: '518',
    },
  ];

  get totalFollowers(): number {
    return this.socialMedia.reduce((sum, social) => sum + social.followers, 0);
  }

  get totalContent(): number {
    return this.contents.length;
  }

  get pendingContent(): number {
    return this.contents.filter((c) => c.status === 'Pending').length;
  }

  get completionPercentage(): number {
    if (this.totalContent === 0) return 0;
    return Math.round(
      ((this.totalContent - this.pendingContent) / this.totalContent) * 100
    );
  }

  get totalViews(): string {
    const views = this.contents.reduce((total, content) => {
      const value = parseFloat(content.views.replace(/[^\d.]/g, ''));
      if (content.views.toUpperCase().includes('K')) {
        return total + value * 1000;
      }
      if (content.views.toUpperCase().includes('M')) {
        return total + value * 1000000;
      }
      return total + value;
    }, 0);

    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  }

  ngOnInit(): void {
    this.influencerId = Number(this.route.snapshot.paramMap.get('id'));
  }

  goBack(): void {
    this.location.back();
  }

  openPost(content: ContentItem): void {
    window.open('#', '_blank');
  }

  getPlatformIcon(platform: string): string {
    switch (platform) {
      case 'Instagram':
        return '◎';
      case 'TikTok':
        return '♪';
      case 'Facebook':
        return 'f';
      case 'YouTube':
        return '▶';
      case 'X':
        return '𝕏';
      default:
        return '•';
    }
  }

  formatFollowers(count: number): string {
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
    if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
    return String(count);
  }
}
