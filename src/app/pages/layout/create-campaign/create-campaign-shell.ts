import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * The one place a brand starts a campaign. The tabs choose the kind: a package campaign (hire creators, escrow,
 * drafts and verified posts) or a share campaign (creators share your content and are paid per verified share).
 */
@Component({
  selector: 'app-create-campaign-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="kinds">
      <nav class="kinds__tabs" aria-label="Kind of campaign">
        <a routerLink="package" routerLinkActive="is-on" ariaCurrentWhenActive="page" class="kinds__tab">Package</a>
        <a routerLink="share" routerLinkActive="is-on" ariaCurrentWhenActive="page" class="kinds__tab">
          Share <span class="kinds__soon">Coming soon</span>
        </a>
      </nav>
      <router-outlet />
    </div>
  `,
  styles: [`
    .kinds { display: flex; flex-direction: column; gap: var(--space-3); }
    .kinds__tabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .kinds__tab { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: var(--fs-secondary); color: var(--muted); text-decoration: none;
      &:hover { background: var(--surface-2); color: var(--text); }
      &.is-on { background: var(--accent-soft); color: var(--accent-dark); } }
    .kinds__soon { padding: 1px 8px; border-radius: 99px; font-size: var(--fs-caption); font-weight: 600; background: var(--warning-soft); color: var(--warning); }
  `],
})
export class CreateCampaignShell {}
