import { isTokenExpired, tokenExpiry } from './jwt';

function token(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

describe('jwt utils', () => {
  it('reads the exp claim', () => {
    expect(tokenExpiry(token({ exp: 123 }))).toBe(123);
  });

  it('treats missing or malformed tokens as expired', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });

  it('compares exp against now', () => {
    const now = 1_000_000_000_000;
    expect(isTokenExpired(token({ exp: now / 1000 - 1 }), now)).toBe(true);
    expect(isTokenExpired(token({ exp: now / 1000 + 60 }), now)).toBe(false);
  });

  it('accepts tokens without an exp claim', () => {
    expect(isTokenExpired(token({ sub: 1 }))).toBe(false);
  });
});
