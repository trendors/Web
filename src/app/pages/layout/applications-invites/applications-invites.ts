import { ApplicationsLists } from "../../../components/applications-lists/applications-lists";
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { InvitesLists } from "../../../components/invites-lists/invites-lists";


@Component({
  selector: 'app-applications-invites',
  imports: [ApplicationsLists, InvitesLists ],
  templateUrl: './applications-invites.html',
  styleUrl: './applications-invites.scss',
})
export class ApplicationsInvites  {
  onSelectApplication($event: string) {
    throw new Error('Method not implemented.');
  }
  applications: any[] = [
     {
      "id": "a1",
      "brand": "Konga",
      "campaignTitle": "Ramadan promo",
      "tier": "Micro",
      "platform": "Instagram",
      "payout": 14000,
      "status": "pending",
      "appliedAt": "2 days ago",
      "bio": "You applied for the Micro tier slot on this campaign."
    },
    {
      "id": "a2",
      "brand": "Jumia",
      "campaignTitle": "Flash sale weekend",
      "tier": "Nano",
      "platform": "TikTok",
      "payout": 6200,
      "status": "accepted",
      "appliedAt": "4 days ago",
      "deadline": "2 days left to post",
      "bio": "Accepted! Post your content before the deadline to stay in the slot."
    },
    {
      "id": "a3",
      "brand": "PiggyVest",
      "campaignTitle": "Savings challenge",
      "tier": "Mid",
      "platform": "Instagram",
      "payout": 31000,
      "status": "posted",
      "appliedAt": "6 days ago",
      "postLink": "https://instagram.com/p/xyz"
    },
    {
      "id": "a4",
      "brand": "MTN",
      "campaignTitle": "Data bundle push",
      "tier": "Micro",
      "platform": "Instagram",
      "payout": 14000,
      "status": "paid",
      "appliedAt": "12 days ago"
    },
  ];
  selectedId: string | null = null;

  selectedApplicationId = signal<string | null>(null);
  selectedInviteId = signal<string | null>(null);
  tab = signal<any>('applications');

  invites = [
     {
    id: 'i1',
    brand: 'Zenith Foods',
    campaignTitle: 'Ramadan hamper launch',
    platform: 'Instagram',
    baselineOffer: 150000,
    currentOffer: 150000,
    status: 'awaiting_response',
    round: 1,
    maxRounds: 3,
    escrowHeld: 150000,
    messages: [
      {
        from: 'advertiser',
        amount: 150000,
        note: '1 feed post + 2 stories, live 48h minimum.',
        timestamp: 'Mon, 9:00 AM'
      }
    ]
  },
  {
    id: 'i2',
    brand: 'Glow Naturals',
    campaignTitle: 'Skincare relaunch',
    platform: 'Instagram',
    baselineOffer: 200000,
    currentOffer: 260000,
    status: 'negotiating',
    round: 2,
    maxRounds: 3,
    escrowHeld: 200000,
    messages: [
      {
        from: 'advertiser',
        amount: 200000,
        note: '1 feed post + 3 story frames, live for 48h minimum.',
        timestamp: 'Mon, 2:14 PM'
      },
      {
        from: 'creator',
        amount: 260000,
        note: 'Countering — my usual rate for this reach is higher.',
        timestamp: 'Mon, 6:40 PM'
      }
    ]
  },
  {
    id: 'i3',
    brand: 'Tecno Mobile',
    campaignTitle: 'Camon launch',
    platform: 'Instagram',
    baselineOffer: 220000,
    currentOffer: 220000,
    status: 'active',
    round: 1,
    maxRounds: 3,
    escrowHeld: 220000,
    deliverDeadline: 'Aug 20',
    messages: [{ from: 'advertiser', amount: 220000, note: 'Deal accepted.', timestamp: '3 days ago' }]
  },
   ]


  readonly advertiserBadgeCount = 0; // wire to your advertiser-side service when it exists
  creatorBadgeCount = {}

  setTab(tab: any): void {
    this.tab.set(tab);
    this.selectedApplicationId.set(null);
    this.selectedInviteId.set(null);
  }

  onModeChange(next: any): void {
  }

  selectApplication(id: string): void { this.selectedApplicationId.set(id); }
  selectInvite(id: string): void { this.selectedInviteId.set(id); }

  closeDetail(): void {
    this.selectedApplicationId.set(null);
    this.selectedInviteId.set(null);
  }

  onSubmitLink(payload: { id: string; link: string }): void {
  }

  onRespondToInvite(payload: { id: string; action: 'accept' | 'decline' }): void {
  }

  onCounterOffer(payload: { id: string; amount: number; note: string }): void {
  }
}
