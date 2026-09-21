/** Normalize a platform name to a brand-icon key for the inline SVGs. */
export type PlatformIconKey = 'instagram' | 'tiktok' | 'youtube' | 'x' | 'facebook' | 'other';

export function platformIconKey(platform: string | null | undefined): PlatformIconKey {
  const key = (platform ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['twitter', 'x', 'xtwitter'].includes(key)) return 'x';
  if (['instagram', 'ig'].includes(key)) return 'instagram';
  if (['tiktok'].includes(key)) return 'tiktok';
  if (['youtube', 'yt'].includes(key)) return 'youtube';
  if (['facebook', 'fb', 'meta'].includes(key)) return 'facebook';
  return 'other';
}

/** Short human label for filter dropdowns and icon titles. */
export function platformLabel(platform: string | null | undefined): string {
  const key = platformIconKey(platform);
  if (key === 'other') return (platform ?? '').trim() || 'Other';
  if (key === 'x') return 'X';
  return key.charAt(0).toUpperCase() + key.slice(1);
}
