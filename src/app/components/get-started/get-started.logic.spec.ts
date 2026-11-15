import { allDone, brandSteps, creatorSteps } from './get-started.logic';

const facts = (o: any = {}) => ({ xConnected: false, nichesCount: 0, matchCount: null, applied: false, bankAdded: false, ...o });

describe('creatorSteps', () => {
  it('starts with connecting X and adding niches, in that order', () => {
    const s = creatorSteps(facts());
    expect(s.map((x) => x.id)).toEqual(['x', 'niches', 'apply', 'bank']);
    expect(s.every((x) => !x.done)).toBe(true);
    expect(s[0]).toMatchObject({ link: '/home/profile', query: { tab: 'socials' } });
    expect(s[1]).toMatchObject({ link: '/home/profile', query: { tab: 'niches' } });
  });
  it('ticks each step from the account, not from clicks', () => {
    const s = creatorSteps(facts({ xConnected: true, nichesCount: 2, applied: true, bankAdded: true }));
    expect(s.map((x) => x.done)).toEqual([true, true, true, true]);
    expect(allDone(s)).toBe(true);
  });
  it('names the number of campaigns that match', () => {
    expect(creatorSteps(facts({ xConnected: true, nichesCount: 1, matchCount: 3 }))[2].title).toBe('See the 3 campaigns you can apply for');
    expect(creatorSteps(facts({ xConnected: true, nichesCount: 1, matchCount: 1 }))[2].title).toBe('See the 1 campaign you can apply for');
    expect(creatorSteps(facts({ matchCount: 0 }))[2].title).toBe('Browse campaigns you can apply for');
  });
  it('explains why there is nothing to apply for yet when setup is missing', () => {
    expect(creatorSteps(facts({ xConnected: true }))[2].hint).toContain('Finish the two steps');
  });
});

describe('brandSteps', () => {
  it('offers three places to go and never claims anything is done', () => {
    const s = brandSteps();
    expect(s.map((x) => x.id)).toEqual(['campaign', 'fund', 'review']);
    expect(allDone(s)).toBe(false);
  });
});
