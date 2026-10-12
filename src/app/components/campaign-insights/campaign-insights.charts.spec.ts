import { compact, lineGeometry, naira, nearestIndex, niceMax, yTicks } from './campaign-insights.charts';

const box = { width: 640, height: 240, left: 48, right: 16, top: 12, bottom: 28 };

describe('insight chart helpers', () => {
  it('compacts big numbers', () => {
    expect([0, 950, 1234, 12900, 3_400_000, 2_100_000_000].map(compact)).toEqual(['0', '950', '1.2K', '12.9K', '3.4M', '2.1B']);
  });

  it('writes naira, compacting from a million', () => {
    expect(naira(25000)).toBe('₦25,000');
    expect(naira(1_250_000)).toBe('₦1.3M');
  });

  it('rounds a maximum up to a clean number', () => {
    expect([0, 3, 7, 12, 180, 2600, 4900].map(niceMax)).toEqual([1, 5, 10, 20, 200, 5000, 5000]);
  });

  it('gives gridlines that start at zero and end at the clean maximum', () => {
    expect(yTicks(2600)).toEqual([0, 1250, 2500, 3750, 5000]);
    expect(yTicks(0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('places the first point at the left edge and the last at the right', () => {
    const g = lineGeometry([0, 50, 100], box);
    expect(g.points[0].x).toBe(48);
    expect(g.points[2].x).toBe(624);
    expect(g.top).toBe(100);
    expect(g.points[2].y).toBe(12); // the maximum sits at the top of the plot
    expect(g.points[0].y).toBe(g.baseline); // zero sits on the baseline
  });

  it('centres a single point and closes the area on the baseline', () => {
    const g = lineGeometry([10], box);
    expect(g.points[0].x).toBe(336);
    expect(g.area.endsWith('Z')).toBe(true);
  });

  it('gives an empty path for no data', () => {
    expect(lineGeometry([], box)).toMatchObject({ line: '', area: '', points: [] });
  });

  it('finds the nearest day under the pointer', () => {
    expect([0, 0.24, 0.26, 0.5, 1, 2, -1].map((f) => nearestIndex(f, 5))).toEqual([0, 1, 1, 2, 4, 4, 0]);
    expect(nearestIndex(0.9, 1)).toBe(0);
  });
});
