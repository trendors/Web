// import { Component, inject } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';

// @Component({
//   selector: 'app-view-influencer-metrics',
//   imports: [],
//   templateUrl: './view-influencer-metrics.html',
//   styleUrl: './view-influencer-metrics.scss',
// })
// export class ViewInfluencerMetrics {
//   private route = inject(ActivatedRoute);
//   influencerId: number | null = null;

//   ngOnInit(): void {
//     this.influencerId = Number(this.route.snapshot.paramMap.get('id'));
//   }

//   goBack(): void {
//     window.history.back();
//   }
// }


import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Location } from '@angular/common';


interface ContentMetric {
    title: string;
    type: string;
    platform: 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | 'X';
    date: string;
    image: string;
    postUrl?: string;
    payout: number;
    payoutLabel: 'Paid out' | 'To be paid';
    status: 'Paid' | 'Pending';
    views: string;
    likes: string;
    comments: string;
    shares: string;
}

@Component({
    selector: 'app-view-influencer-metrics',
    imports: [CommonModule],
    templateUrl: './view-influencer-metrics.html',
    styleUrl: './view-influencer-metrics.scss',
})
export class InfluencerMetricsComponent {
    private router = inject(Router);
    private location = inject(Location);


    influencer = {
        name: 'Maya Chen',
        username: '@maya.glows',
        campaign: 'GlowSkin Skincare Launch',
        avatar:
            'https://storage.googleapis.com/banani-avatars/avatar/female/25-35/East%20Asian/4',
        status: 'Active',
        platform: 'Instagram',
        followers: '128K',
        completed: 2,
        totalContent: 2,
        totalPayout: 850,
        paid: 450,
        pending: 400,
    };

    contents: ContentMetric[] = [
        {
            title: 'Skincare Routine',
            type: 'Reel',
            platform: 'Instagram',
            date: 'Mar 18, 2026',
            image:
                'https://storage.googleapis.com/banani-generated-images/generated-images/99d04722-27aa-4002-a4bf-a4221433cc4f.jpg',
            postUrl: '#',
            payout: 450,
            payoutLabel: 'Paid out',
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
            postUrl: '#',
            payout: 400,
            payoutLabel: 'To be paid',
            status: 'Pending',
            views: '18.7K',
            likes: '2.1K',
            comments: '142',
            shares: '518',
        },
    ];

    get completionPercentage(): number {
        if (!this.influencer.totalContent) {
            return 0;
        }

        return Math.round(
            (this.influencer.completed / this.influencer.totalContent) * 100
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

    goBack(): void {
        // go back to previous page
        this.location.back();
    }

    createCampaign(): void {
        // Replace with your router navigation/modal logic
        console.log('Create campaign');
    }

    openPost(content: ContentMetric): void {
        if (content.postUrl && content.postUrl !== '#') {
            window.open(content.postUrl, '_blank');
        }
    }

    getPlatformIcon(platform: ContentMetric['platform']): string {
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
}