import { platformIconKey, platformLabel } from './platform-icon';

describe('platformIconKey', () => {
  it.each([
    ['Instagram', 'instagram'],
    ['instagram', 'instagram'],
    ['TikTok', 'tiktok'],
    ['YouTube', 'youtube'],
    ['twitter', 'x'],
    ['X', 'x'],
    ['Facebook', 'facebook'],
    ['something-new', 'other'],
    ['', 'other'],
    [null, 'other'],
  ])('should map %s to %s', (input, expected) => {
    expect(platformIconKey(input)).toBe(expected);
  });
});

describe('platformLabel', () => {
  it('should produce short display labels', () => {
    expect(platformLabel('instagram')).toBe('Instagram');
    expect(platformLabel('twitter')).toBe('X');
    expect(platformLabel('')).toBe('Other');
  });
});
