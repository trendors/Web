import { errText, label, naira, timeLeft, tone } from './package-format';

describe('package formatting', () => {
  it('shows naira and tolerates missing values', () => {
    expect(naira(1500)).toBe('₦1,500');
    expect(naira('2500.5')).toBe('₦2,500.5');
    expect(naira(null)).toBe('₦0');
  });

  it('names states plainly and falls back to the raw text', () => {
    expect(label('awaiting_payment')).toBe('Awaiting payment');
    expect(label('published')).toContain('awaiting verification');
    expect(label('some_new_state')).toBe('some new state');
  });

  it('colours problems red, waiting amber and done green', () => {
    expect(tone('cancelled')).toBe('red');
    expect(tone('in_review')).toBe('amber');
    expect(tone('verified')).toBe('green');
  });

  it('counts down to a close, and says closed after it', () => {
    expect(timeLeft(new Date(Date.now() + 2 * 86_400_000 + 3_600_000).toISOString())).toMatch(/^2d/);
    expect(timeLeft(new Date(Date.now() - 1000).toISOString())).toBe('closed');
    expect(timeLeft(null)).toBe('');
  });

  it('shows every validation error the server listed, else its message', () => {
    expect(errText({ error: { errors: ['Give the campaign a name.', 'Choose a package.'] } })).toBe('Give the campaign a name. Choose a package.');
    expect(errText({ error: { message: ['a', 'b'] } })).toBe('a, b');
    expect(errText({})).toMatch(/try again/i);
  });
});

describe('platformName and compact', () => {
  it('calls twitter X and names the others as people know them', async () => {
    const { platformName } = await import('./package-format');
    expect(platformName('twitter')).toBe('X');
    expect(platformName('tiktok')).toBe('TikTok');
    expect(platformName('youtube')).toBe('YouTube');
    expect(platformName('snapchat')).toBe('Snapchat');
    expect(platformName(null)).toBe('');
  });

  it('shortens follower counts', async () => {
    const { compact } = await import('./package-format');
    expect(compact(980)).toBe('980');
    expect(compact(1250)).toBe('1.3k');
    expect(compact(15400)).toBe('15k');
    expect(compact(1_200_000)).toBe('1.2M');
    expect(compact(null)).toBe('0');
  });
});

describe('nairaShort', () => {
  it('keeps tile amounts short', async () => {
    const { nairaShort } = await import('./package-format');
    expect(nairaShort(1500)).toBe('₦1,500');
    expect(nairaShort(2142.86)).toBe('₦2,143');
    expect(nairaShort(99999)).toBe('₦99,999');
    expect(nairaShort(272727.26)).toBe('₦272.7k');
    expect(nairaShort(1_250_000)).toBe('₦1.3M');
    expect(nairaShort(null)).toBe('₦0');
  });
});
