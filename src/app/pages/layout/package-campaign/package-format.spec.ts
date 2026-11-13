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
