/** Read a JWT's `exp` (seconds) without verifying it; null if unreadable. */
export function tokenExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/**
 * True when the token is missing, malformed or past its `exp`. A token with
 * no `exp` claim is treated as valid; the server still has the final say.
 */
export function isTokenExpired(token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return true;
  if (token.split('.').length !== 3) return true;
  const exp = tokenExpiry(token);
  return exp != null && exp * 1000 <= now;
}
