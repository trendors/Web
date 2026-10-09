#!/usr/bin/env node
/**
 * Night-mode guard: fails when component styles hard-code a colour that a
 * theme token should provide (white/grey backgrounds, grey borders, dark or
 * grey text, pale status tints). Those would stay light in night mode.
 *
 * Allowed: brand colours, saturated fills with white text, shadows,
 * gradients, var() fallbacks, comments, and any line marked `theme-ok`.
 * Usage: node scripts/check-theme-colors.mjs [srcDir]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? 'src/app';
const COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const DECL = /(?<![\w$-])(-?-?[a-zA-Z][a-zA-Z-]*)(\s*:\s*)([^;{}]+)/g;

function parse(c) {
  c = c.trim().toLowerCase();
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const n = c.slice(c.indexOf('(') + 1, -1).split(/[,/]/).map((x) => parseFloat(x));
  if (n.slice(0, 3).some(Number.isNaN)) return null;
  return { r: n[0] / 255, g: n[1] / 255, b: n[2] / 255, a: n.length > 3 ? n[3] : 1 };
}

function hls({ r, g, b }) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return { l, s };
}

/** True when a theme token exists for this colour in this property. */
function shouldBeToken(prop, c) {
  const p = parse(c);
  if (!p) return false;
  const { l, s } = hls(p);
  const bg = prop === 'background' || prop === 'background-color';
  const text = ['color', 'fill', 'stroke'].includes(prop);
  const border = prop.startsWith('border') || prop.startsWith('outline');
  if (p.a < 1) return bg && l < 0.3 && p.a >= 0.02; // dark overlays/tints
  const neutral = s < 0.25 || l < 0.2 || (s < 0.45 && l >= 0.2 && l <= 0.75);
  if (neutral) {
    if (bg) return l >= 0.6 || l < 0.2;
    if (text) return l < 0.72;
    if (border) return true;
    return false;
  }
  if (bg && l >= 0.85) return true; // pale status tint
  if (text && l < 0.5) return true; // dark status text
  return false;
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (p.endsWith('.scss')) yield p;
  }
}

const problems = [];
for (const file of files(root)) {
  let inBlock = false;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const t = line.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
    if (t.startsWith('/*') && !t.includes('*/')) { inBlock = true; return; }
    if (t.startsWith('//') || t.startsWith('$') || line.includes('theme-ok') || !COLOR.test(line)) return;
    COLOR.lastIndex = 0;
    const code = line.replace(/\/\/.*$/, '');
    for (const m of code.matchAll(DECL)) {
      const prop = m[1].toLowerCase();
      const value = m[3];
      if (prop.startsWith('--') || /shadow|filter|mask/.test(prop) || /gradient|url\(/.test(value)) continue;
      for (const cm of value.matchAll(COLOR)) {
        const before = value.slice(0, cm.index);
        if ((before.match(/var\(/g) ?? []).length > (before.match(/\)/g) ?? []).length) continue; // var() fallback
        if (shouldBeToken(prop, cm[0])) problems.push(`${relative(process.cwd(), file)}:${i + 1}  ${prop}: ${cm[0]}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`Hard-coded colours that should use theme tokens (they won't change in night mode):\n`);
  for (const p of problems) console.error('  ' + p);
  console.error(`\nUse a token from src/styles.scss (--surface, --surface-2, --border, --text, --muted, --*-soft…),\nor add a "theme-ok" comment on the line if the colour must stay fixed (e.g. a brand colour).`);
  process.exit(1);
}
console.log('theme colours OK');
