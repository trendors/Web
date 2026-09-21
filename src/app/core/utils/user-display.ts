/**
 * Display-name and profile-shape helpers that work for every account shape.
 *
 * The backend is inconsistent about where person data lives:
 * - creators may carry `creativeProfile` — or, in practice, `influncerProfile`
 *   (sic) — while `creativeProfile` stays null;
 * - person names are ALSO duplicated top-level as `first_name`/`last_name`;
 * - brand-only accounts have neither, with the person name (if any) in
 *   `brandProfile.contact_name` (a single free-text field).
 *
 * Profile detection treats null/empty objects as absent, so a stray
 * `brandProfile: {}` never counts as a brand.
 */
function asRecord(user: unknown): Record<string, unknown> {
  return ((user ?? {}) as Record<string, unknown>) ?? {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Present and meaningful: not null, and objects must carry at least one value. */
function isPresent(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (typeof value !== 'object') return true;
  const values = Object.values(value);
  return values.length > 0 && values.some((v) => v != null && v !== '');
}

const BRAND_KEYS = ['brandProfile', 'brand_profile'];
const CREATIVE_KEYS = [
  'creativeProfile',
  'creative_profile',
  'influncerProfile',
  'influencerProfile',
  'influencer_profile',
];

function firstPresent(user: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  for (const key of keys) {
    const value = user[key];
    if (value != null && typeof value === 'object') return value as Record<string, unknown>;
  }
  return {};
}

function pickText(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(obj[key]);
    if (value) return value;
  }
  return '';
}

export function hasBrandProfile(user: unknown): boolean {
  const record = asRecord(user);
  return BRAND_KEYS.some((key) => isPresent(record[key]));
}

export function hasCreativeProfile(user: unknown): boolean {
  const record = asRecord(user);
  return CREATIVE_KEYS.some((key) => isPresent(record[key]));
}

function splitContactName(contact: unknown): [string, string] {
  const parts = text(contact).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return ['', ''];
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

function emailPrefix(user: Record<string, unknown>): string {
  const email = text(user['email']);
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : '';
}

const FIRST_NAME_KEYS = ['first_name', 'firstName', 'firstname', 'given_name'];
const LAST_NAME_KEYS = ['last_name', 'lastName', 'lastname', 'family_name', 'surname'];

export function userFirstName(user: unknown): string {
  const record = asRecord(user);
  const creative = firstPresent(record, CREATIVE_KEYS);
  return (
    pickText(creative, FIRST_NAME_KEYS) ||
    pickText(record, FIRST_NAME_KEYS) ||
    splitContactName(
      firstPresent(record, BRAND_KEYS)['contact_name'] ??
        firstPresent(record, BRAND_KEYS)['contactName'],
    )[0] ||
    text(record['user_name']) ||
    text(record['userName']) ||
    emailPrefix(record)
  );
}

export function userLastName(user: unknown): string {
  const record = asRecord(user);
  const creative = firstPresent(record, CREATIVE_KEYS);
  return (
    pickText(creative, LAST_NAME_KEYS) ||
    pickText(record, LAST_NAME_KEYS) ||
    splitContactName(
      firstPresent(record, BRAND_KEYS)['contact_name'] ??
        firstPresent(record, BRAND_KEYS)['contactName'],
    )[1]
  );
}

export function userDisplayName(user: unknown): string {
  const record = asRecord(user);
  const brand = firstPresent(record, BRAND_KEYS);
  const full = `${userFirstName(user)} ${userLastName(user)}`.trim();
  return (
    full ||
    text(brand['brand_name']) ||
    text(brand['brandName']) ||
    text(brand['contact_name']) ||
    text(brand['contactName']) ||
    text(record['user_name']) ||
    text(record['userName']) ||
    text(record['email']) ||
    'User'
  );
}
