/** Small, pure helpers for the insights charts. */

/** 950 -> "950", 1,234 -> "1.2K", 12,900 -> "12.9K", 3,400,000 -> "3.4M". */
export function compact(value: number): string {
  const n = Math.abs(value);
  const trim = (v: number) => (Math.round(v * 10) / 10).toString();
  const sign = value < 0 ? '-' : '';
  if (n >= 1_000_000_000) return `${sign}${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${sign}${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${sign}${trim(n / 1_000)}K`;
  return `${sign}${Math.round(n)}`;
}

/** Naira with thousands separators, compacted from a million up. */
export function naira(value: number): string {
  const n = Math.round(value);
  return Math.abs(n) >= 1_000_000 ? `₦${compact(n)}` : `₦${n.toLocaleString('en-US')}`;
}

/** The smallest "round" number (1, 2, 2.5, 5 × 10^k) at or above `max`. */
export function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= max) return step * magnitude;
  }
  return 10 * magnitude;
}

/** Evenly spaced gridline values from 0 to the nice maximum. */
export function yTicks(max: number, intervals = 4): number[] {
  const top = niceMax(max);
  return Array.from({ length: intervals + 1 }, (_, i) => (top / intervals) * i);
}

export interface PlotBox {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LineGeometry {
  top: number;
  points: { x: number; y: number }[];
  line: string;
  area: string;
  baseline: number;
}

/** Turns values into pixel positions plus the line and area paths. */
export function lineGeometry(values: number[], box: PlotBox): LineGeometry {
  const plotW = box.width - box.left - box.right;
  const plotH = box.height - box.top - box.bottom;
  const top = niceMax(Math.max(0, ...values));
  const baseline = box.top + plotH;
  const x = (i: number) => (values.length === 1 ? box.left + plotW / 2 : box.left + (i * plotW) / (values.length - 1));
  const y = (v: number) => baseline - (v / top) * plotH;
  const points = values.map((v, i) => ({ x: round(x(i)), y: round(y(v)) }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = points.length
    ? `${line} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`
    : '';
  return { top, points, line, area, baseline };
}

/** Which data position a pointer at `fraction` (0..1 across the plot) is nearest to. */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}

const round = (v: number) => Math.round(v * 100) / 100;
