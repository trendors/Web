export interface Step { id: string; title: string; hint: string; link: string; query?: Record<string, string>; done: boolean }

export interface CreatorFacts {
  xConnected: boolean;
  nichesCount: number;
  matchCount: number | null; // null = not loaded yet
  applied: boolean;
  bankAdded: boolean;
}

/** The creator's first steps, each ticked from what is actually on the account. */
export function creatorSteps(f: CreatorFacts): Step[] {
  return [
    { id: 'x', title: 'Connect your X account', hint: 'Campaigns match on your platform and follower count.', link: '/home/profile', query: { tab: 'socials' }, done: f.xConnected },
    { id: 'niches', title: 'Add your niches', hint: 'We only show campaigns that fit what you post about.', link: '/home/profile', query: { tab: 'niches' }, done: f.nichesCount > 0 },
    {
      id: 'apply',
      title: f.matchCount ? `See the ${f.matchCount} campaign${f.matchCount === 1 ? '' : 's'} you can apply for` : 'Browse campaigns you can apply for',
      hint: f.xConnected && f.nichesCount > 0 ? 'Pick one and apply with a short pitch.' : 'Finish the two steps above and matching campaigns will appear.',
      link: '/home/opportunities',
      query: { tab: 'discover' },
      done: f.applied,
    },
    { id: 'bank', title: 'Add your bank account', hint: 'So your earnings can be paid out.', link: '/home/profile', query: { tab: 'wallet' }, done: f.bankAdded },
  ];
}

/** Brands: three places to go. No ticks, because nothing here can be read reliably from the account alone. */
export function brandSteps(): Step[] {
  return [
    { id: 'campaign', title: 'Create your first campaign', hint: 'Pick a package, set your budget and who you want to reach.', link: '/home/create-campaign', done: false },
    { id: 'fund', title: 'Fund your wallet', hint: 'Pay by card, or top up now so launching is instant.', link: '/home/profile', query: { tab: 'wallet' }, done: false },
    { id: 'review', title: 'Review creator applications', hint: 'Once a campaign is live, creators who fit will apply here.', link: '/home/view-campaign', done: false },
  ];
}

export const allDone = (steps: Step[]) => steps.length > 0 && steps.every((s) => s.done);
