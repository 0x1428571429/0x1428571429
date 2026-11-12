'use strict';
// HD-2D style sprites (Octopath-Traveler-like look): fan-art of Breath of the Wild's champions.
// Each sprite is authored as flat material letters; the engine adds 3-tone form shading (light from the
// upper left), colored selective outlines and a ground shadow. Each character also gets a biome backdrop
// (blurred far layer, light shafts, floating motes, blurred foreground) for the depth-of-field feel.
const M = require('./mascots');
const PXB = 3, GW = 24, GH = 36, AW = 22;
const OFFX = 136 - (GW + 2) * PXB, OFFY = 96 - (GH + 2) * PXB; // local coords of the scene's character group

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const half = s => { const l = row0(s); if (l.length !== 10) throw new Error('half row ' + s + ' is ' + l.length); return l + [...l].reverse().join('') + '..'; };
const row0 = s => { let o = ''; for (const tk of s.trim().split(/\s+/)) o += tk[0].repeat(+tk.slice(1)); return o; };
const row = s => (s.startsWith('m ') ? half(s.slice(2)) : row0(s)); // 'm ' = left half (cols 0-9), mirrored around the body axis

let RIM = process.env.HD_RIM !== '0';
function shade(g, pal, flat, tex = '', rim = '#fff4d6') {
  const at = (r, c) => (g[r] && g[r][c]) || '.';
  const out = g.map(r => r.map(() => null));
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[r].length; c++) {
    const L = g[r][c];
    if (L === '.') {
      const nb = [[r + 1, c], [r, c - 1], [r, c + 1], [r - 1, c]].find(([y, x]) => at(y, x) !== '.');
      if (nb) out[r][c] = mix(pal[at(nb[0], nb[1])], '#0f0a1a', nb[0] > r ? 0.6 : 0.74);
      continue;
    }
    const base = pal[L];
    if (!base) throw new Error('no color for ' + L);
    if (flat.includes(L)) { out[r][c] = base; continue; }
    // volume shading: light from the upper left across the whole silhouette row, rim light on the far right edge
    let s = c, e = c; while (at(r, s - 1) !== '.') s--; while (at(r, e + 1) !== '.') e++;
    const len = e - s + 1, f = len > 1 ? (c - s) / (len - 1) : 0.5, up = at(r - 1, c), dn = at(r + 1, c);
    const LIGHT = mix(base, '#fff4d6', 0.18), SH = mix(base, '#2a1f4a', 0.2), DEEP = mix(base, '#1b1236', 0.36), wide = len >= 7;
    let col = base;
    if (len >= 3 && f < 0.3) col = LIGHT;
    else if (len >= 4 && f > 0.68) col = SH;
    if (wide && at(r, c + 1) !== '.' && at(r, c + 2) === '.') col = DEEP;
    if (up === '.' && f < 0.75) col = LIGHT;
    else if (up !== '.' && up !== L && !flat.includes(up)) col = col === LIGHT ? base : SH; // occlusion under the part above
    if (dn === '.' && col !== DEEP) col = SH;
    if (at(r, c + 1) === '.' && len >= 2) col = wide ? (RIM && r > 2 ? mix(base, rim, 0.4) : DEEP) : SH;
    out[r][c] = col;
  }
  return out;
}
const rects = cells => { // cells: 2D array of colors (padded coords)
  let o = '';
  cells.forEach((r, y) => { let c = 0; while (c < r.length) { const k = r[c]; if (!k) { c++; continue; } let e = c; while (e < r.length && r[e] === k) e++; o += `<rect x="${OFFX + c * PXB}" y="${OFFY + y * PXB}" width="${(e - c) * PXB}" height="${PXB}" fill="${k}"/>`; c = e; } });
  return o;
};
const dots = (cells, pal) => cells.map(([r, c, k]) => `<rect x="${OFFX + (c + 1) * PXB}" y="${OFFY + (r + 1) * PXB}" width="${PXB}" height="${PXB}" fill="${pal[k]}"/>`).join('');

// side view, facing left: the near arm is its own outlined layer. Down: hangs over the torso.
// Waving: upper arm reaches forward at chest height, forearm up, hand in front of the face toward the bubble.
function armCells({ sr = 14, sc = 8, w = 2, s, h }, pose) {
  const o = [], fill = (r0, r1, c0, c1, k) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) o.push([r, c, k]); };
  if (pose === 'down') { fill(sr, sr + 7, sc, sc + w - 1, s); fill(sr + 8, sr + 9, sc, sc + w - 1, h); return o; }
  const k = pose === 'up2' ? -1 : 0;
  fill(sr + 1, sr + w, 1, sc + w - 1, s);
  fill(sr - 3, sr, 1, w, s);
  fill(sr - 5, sr - 4, 1 + k, w + k, h);
  return o;
}

function make(c) {
  const flat = (c.flat || '') + 'emiuvL', tex = c.tex || 'h';
  if (!c.pal.L) c.pal.L = mix(c.pal[tex[0]], '#fff6e0', 0.45);
  if (c.shine !== false) c.cells = [...(c.cells || []), ...(c.shine || [[2, 6], [2, 7], [2, 8], [3, 5], [3, 6]]).map(([r, cc]) => [r, cc, 'L'])];
  const base = c.rows.map((s, i) => { const r = row(s); if (r.length !== AW) throw new Error(c.name + ' row ' + i + ' is ' + r.length); return r.padEnd(GW, '.').split(''); });
  if (base.length !== GH) throw new Error(c.name + ' has ' + base.length + ' rows');
  for (const [r, cc, k] of c.cells || []) base[r][cc] = k;
  const grid = (extra = [], empty = false) => {
    const g = empty ? base.map(r => r.map(() => '.')) : base.map(r => r.slice());
    for (const [r, cc, k] of extra) if (g[r] && cc >= 0 && cc < GW) g[r][cc] = k;
    const blank = Array(GW + 2).fill('.');
    return [blank, ...g.map(r => ['.', ...r, '.']), blank.slice()];
  };
  const rim = BIOME[c.biome].mote, sh = g => shade(g, c.pal, flat, tex, rim);
  const B = sh(grid());
  const layer = cells => rects(sh(grid(cells, true)));
  const cx = OFFX + (c.cx || 10) * PXB;
  return {
    hd: true, name: c.name, pal: {}, bg: c.bg, tile: c.tile, antenna: '', holdDy: 0, hatRow: 0, hatCol: 0,
    bubbleR: 846, bubbleY: 4,
    body: () => `<ellipse cx="${cx}" cy="96" rx="27" ry="3.5" fill="#000" opacity=".28"/>` + rects(B),
    legs: '',
    get eyes() { return dots(c.eyes || EYES, c.pal); },
    get happy() { return dots(c.happy || HAPPY, c.pal); },
    get armDown() { return layer(armCells(c.arm, 'down')); },
    get up1() { return layer(armCells(c.arm, 'up1')); },
    get up2() { return layer(armCells(c.arm, 'up2')); },
    backdrop: theme => backdrop(c.biome, theme),
    front: theme => front(c.biome, theme),
  };
}

// ---------------------------------------------------------------- HD-2D backdrop
const BIOME = {
  meadow: { accent: '#6fbf4a', mote: '#ffe68a', motion: 'rise', flowers: ['#ffffff', '#ffd23f', '#f28fb0', '#9ad0ff'] },
  zora: { accent: '#4fb6e6', mote: '#bff0ff', motion: 'rise' },
  snow: { accent: '#9db8e8', mote: '#ffffff', motion: 'fall' },
  desert: { accent: '#e0a84a', mote: '#ffd98a', motion: 'drift' },
  volcano: { accent: '#e2552e', mote: '#ffb347', motion: 'rise' },
  ruins: { accent: '#b8a07a', mote: '#fff1c4', motion: 'drift', flowers: ['#ffffff', '#ffd23f'] },
};
const rnd = seed => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
function farShapes(kind, a, b) {
  switch (kind) {
    case 'meadow': return `<path d="M520 122 Q600 78 690 96 T860 84 T960 92 V122Z" fill="${b}"/><path d="M520 122 Q640 98 740 108 T960 104 V122Z" fill="${a}"/>` +
      `<g fill="${b}"><rect x="716" y="52" width="8" height="46"/><rect x="706" y="66" width="28" height="32"/><rect x="740" y="74" width="6" height="26"/><rect x="694" y="78" width="8" height="22"/><polygon points="716,52 720,40 724,52"/></g>`;
    case 'zora': return [600, 650, 700, 770, 840, 900].map((x, i) => `<polygon points="${x},122 ${x + 9},${40 + (i * 17) % 40} ${x + 18},122" fill="${i % 2 ? a : b}"/>`).join('') +
      `<rect x="728" y="0" width="22" height="122" fill="${a}" opacity=".7"/><rect class="hdw" x="732" y="0" width="3" height="122" fill="#ffffff" opacity=".35"/><rect class="hdw" x="742" y="20" width="2" height="102" fill="#ffffff" opacity=".25" style="animation-delay:-1s"/>`;
    case 'snow': return `<polygon points="540,122 640,46 720,122" fill="${b}"/><polygon points="660,122 780,30 900,122" fill="${a}"/><polygon points="840,122 930,58 990,122" fill="${b}"/>` +
      `<polygon points="764,42 780,30 796,42 788,48 780,42 772,48" fill="#ffffff" opacity=".8"/><polygon points="628,56 640,46 652,56 640,60" fill="#ffffff" opacity=".7"/>`;
    case 'desert': return `<circle cx="760" cy="44" r="22" fill="${a}" opacity=".55"/><circle cx="760" cy="44" r="34" fill="${a}" opacity=".18"/>` +
      `<path d="M520 122 Q620 84 720 104 T920 92 T980 100 V122Z" fill="${b}"/><path d="M560 122 Q700 100 820 112 T980 108 V122Z" fill="${a}"/>`;
    case 'volcano': return `<polygon points="600,122 720,40 760,40 900,122" fill="${b}"/><polygon points="716,44 740,30 764,44" fill="${a}" opacity=".85"/>` +
      `<circle class="hdp" cx="740" cy="34" r="20" fill="${a}" opacity=".25"/><path d="M728 40 L734 70 L740 60 L746 84 L752 40Z" fill="${a}" opacity=".6"/>`;
    case 'ruins': return `<g fill="${b}">${[600, 680, 760, 840].map(x => `<rect x="${x}" y="54" width="12" height="68"/>`).join('')}<rect x="596" y="46" width="268" height="10"/>` +
      [612, 692, 772].map(x => `<path d="M${x} 122 V82 Q${x + 34} 56 ${x + 68} 82 V122Z" fill-opacity="0"/>`).join('') + `</g>` +
      `<path d="M520 122 Q660 104 800 112 T980 106 V122Z" fill="${a}"/>`;
  }
  return '';
}
function backdrop(kind, theme) {
  const B = BIOME[kind], t = M.TH[theme], dark = theme === 'dark', bg = t.bg;
  const a = mix(bg, B.accent, dark ? 0.24 : 0.3), b = mix(bg, B.accent, dark ? 0.13 : 0.17);
  const shaft = dark ? '#fff4d0' : '#ffffff', so = dark ? 0.1 : 0.55;
  const r = rnd(kind.length * 97 + 13);
  let motes = '';
  for (let i = 0; i < 12; i++) {
    const x = Math.round(560 + r() * 390), y = Math.round(10 + r() * 100), d = (5 + r() * 5).toFixed(1), dl = (-r() * 10).toFixed(1), s = r() > 0.6 ? 3 : 2;
    motes += `<rect class="hd-${B.motion}" x="${x}" y="${y}" width="${s}" height="${s}" fill="${B.mote}" style="animation-duration:${d}s;animation-delay:${dl}s"/>`;
  }
  return `<style>
@keyframes hdRise{0%{transform:translateY(12px);opacity:0}25%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
@keyframes hdFall{0%{transform:translate(0,-30px);opacity:0}20%{opacity:1}100%{transform:translate(-14px,40px);opacity:0}}
@keyframes hdDrift{0%{transform:translateX(30px);opacity:0}30%{opacity:.9}100%{transform:translateX(-60px);opacity:0}}
@keyframes hdPulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes hdFlow{0%{transform:translateY(-30px)}100%{transform:translateY(30px)}}
.hd-rise{animation:hdRise 7s linear infinite}.hd-fall{animation:hdFall 7s linear infinite}.hd-drift{animation:hdDrift 8s linear infinite}
.hdp,.hdsh{animation:hdPulse 6s ease-in-out infinite}.hdw{animation:hdFlow 1.2s linear infinite}
@media (prefers-reduced-motion:reduce){.hd-rise,.hd-fall,.hd-drift,.hdp,.hdsh,.hdw{animation:none}}
</style><defs>
<linearGradient id="hdFade" gradientUnits="userSpaceOnUse" x1="560" y1="0" x2="700" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="hdMask"><rect width="960" height="140" fill="url(#hdFade)"/></mask>
<linearGradient id="hdShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shaft}" stop-opacity="${so}"/><stop offset="1" stop-color="${shaft}" stop-opacity="0"/></linearGradient>
<radialGradient id="hdBloom"><stop offset="0" stop-color="${B.mote}" stop-opacity="${dark ? 0.22 : 0.45}"/><stop offset="1" stop-color="${B.mote}" stop-opacity="0"/></radialGradient>
<filter id="hdBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="hdBlur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="hdGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="1.2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs><g mask="url(#hdMask)"><g filter="url(#hdBlur)">${farShapes(kind, a, b)}</g>` +
    `<ellipse class="hdp" cx="896" cy="62" rx="110" ry="80" fill="url(#hdBloom)"/><g class="hdsh">${[[610, 0], [720, 1], [850, 2]].map(([x, i]) => `<polygon points="${x},0 ${x + 26 + i * 6},0 ${x + 86},123 ${x + 52},123" fill="url(#hdShaft)"/>`).join('')}</g>` +
    `<g filter="url(#hdGlow)">${motes}</g></g>`;
}
function front(kind, theme) {
  const B = BIOME[kind], t = M.TH[theme], dark = theme === 'dark';
  const leaf = mix(t.bg, B.accent, dark ? 0.45 : 0.55);
  let o = '';
  if (B.flowers) {
    const r = rnd(7);
    for (let i = 0; i < 22; i++) { const x = Math.round(570 + r() * 380); if (x > 850 && x < 940) continue; const k = B.flowers[i % B.flowers.length]; o += `<rect x="${x}" y="118" width="3" height="3" fill="${k}"/><rect x="${x + 1}" y="121" width="1" height="2" fill="${mix(t.bg, '#3f8a2a', 0.8)}"/>`; }
  }
  // blurred out-of-focus foreground (depth of field)
  o += `<g filter="url(#hdBlur2)" opacity="${dark ? 0.75 : 0.6}" fill="${leaf}"><path d="M598 140 Q604 108 614 96 Q610 118 620 140Z"/><path d="M612 140 Q622 116 640 108 Q628 124 632 140Z"/><path d="M944 140 Q946 110 956 98 Q956 120 962 140Z"/></g>`;
  return o;
}

// ---------------------------------------------------------------- characters (side view, facing left)
// 22 cols x 36 rows. Face front at cols 3-4, back of the head ~col 15; torso cols 5-12; near arm is a separate layer.
// Flat letters: e eye, i iris, u blush, v brow, m mouth, L hair shine.
const EYES = [[7, 6, 'e'], [8, 6, 'i']];
const HAPPY = [[8, 5, 'e'], [7, 6, 'e'], [8, 7, 'e'], [10, 5, 'm'], [10, 6, 'm']];
const FACE = [[6, 5, 'v'], [6, 6, 'v'], [9, 7, 'u']];
const SHINE = [[1, 7], [2, 6], [2, 7], [3, 5], [3, 6]];
const blush = s => mix(s, '#ff5a6a', 0.3);
const col = (c, r0, r1, k) => Array.from({ length: r1 - r0 + 1 }, (_, i) => [r0 + i, c, k]);

const CH = {
  link: make({ name: '林克（荒野之息）', biome: 'meadow', bg: { dark: '#10261a', light: '#e2f0d9' }, tile: ['#5fae3a', '#7a5230', '#5a3b22'],
    pal: { h: '#e9c45c', s: '#f1c49c', t: '#3d79c9', p: '#e3ecf2', y: '#d6a535', b: '#6e4527', x: '#3a3a4a', z: '#59d6ff', k: '#5a4636', f: '#7b4f2c', n: '#a8744a', Q: '#4a4fb0', G: '#7a5232',
      e: '#231c33', i: '#3d7fd8', u: blush('#f1c49c'), v: '#a8802e', m: '#9a4a3a' },
    flat: 'z',
    rows: ['.8 h5 .9', '.6 h8 .8', '.5 h10 .7', '.4 h11 .7', '.4 h12 .6', '.4 h3 s3 h7 .5', '.4 s5 h7 .6', '.4 s6 h1 s2 h3 .6', '.3 s7 h1 s1 h4 .6',
      '.4 s6 h6 .6', '.4 s6 h5 .7', '.5 s5 h4 .8', '.7 s3 .1 h3 .8',
      '.6 t1 p2 t3 h2 .8', '.5 t8 .9', '.5 t8 .9', '.5 t8 .9', '.5 t8 .9', '.5 t8 .9', '.5 b8 .9', '.5 b8 .9', '.5 t8 .9', '.5 t8 .9', '.5 p8 .9', '.6 y7 .9',
      ...Array(5).fill('.6 k3 .1 k3 .9'), '.6 n3 .1 n3 .9', ...Array(4).fill('.6 f3 .1 f3 .9'), '.4 f5 .1 f4 .8'],
    cells: [...FACE, [6, 12, 's'], [5, 13, 's'], [14, 11, 'b'], [15, 10, 'b'], [16, 9, 'b'], [17, 8, 'b'], [18, 7, 'b'], [20, 11, 'x'], [20, 12, 'z'],
      [12, 14, 'y'], [11, 14, 'y'], [11, 15, 'Q'], [10, 15, 'Q'], [9, 16, 'Q'], [8, 16, 'y'], ...col(13, 13, 21, 'G'), [23, 7, 't'], [23, 10, 't']],
    shine: SHINE, arm: { s: 't', h: 's' } }),
  mipha: make({ name: '米法（荒野之息）', biome: 'zora', bg: { dark: '#0d2433', light: '#dcedf5' }, tile: ['#4fb3d9', '#2a6f94', '#3a8ab5'],
    pal: { h: '#e0485a', s: '#f0e4ea', j: '#c7d2e6', r: '#d84f5c', c: '#e9ecf5', a: '#3c86d8', q: '#cfd9ea',
      e: '#25304a', i: '#d9a640', u: blush('#f0e4ea'), v: '#b8384a', m: '#b34a5a' },
    rows: ['.7 h5 .10', '.5 h8 .9', '.4 h10 .8', '.4 h11 .7', '.4 h12 .6', '.4 h1 s5 h7 .5', '.4 s6 h7 .5', '.4 s6 h8 .4', '.3 s7 h8 .4',
      '.4 s6 h8 .4', '.4 s6 h8 .4', '.5 s5 .1 h6 .5', '.7 s3 .2 h5 .5',
      '.6 j6 .1 h4 .5', '.5 r1 c6 r1 h4 .5', '.5 c7 a1 h3 .6', '.5 c6 a2 h3 .6', '.5 c5 a2 c1 h2 .7', '.5 c4 a2 c2 h2 .7', '.5 j8 h1 .8', '.5 a8 .9', '.5 a8 .9', '.5 a8 .9', '.5 a3 r2 a3 .9', '.6 a2 r3 a2 .9',
      ...Array(7).fill('.6 r3 .1 r3 .9'), ...Array(3).fill('.6 s3 .1 s3 .9'), '.4 s5 .1 s4 .8'],
    cells: [...FACE, [1, 8, 'j'], [1, 9, 'j'], [2, 8, 'a'], [5, 4, 'j'], [9, 10, 'j'], ...col(18, 3, 34, 'q'), [0, 17, 'q'], [0, 19, 'q'], [1, 17, 'q'], [1, 18, 'q'], [1, 19, 'q'], [2, 18, 'q']],
    shine: SHINE, arm: { s: 'r', h: 's' } }),
  revali: make({ name: '力巴尔（荒野之息）', biome: 'snow', bg: { dark: '#0e1f3d', light: '#dfe7f6' }, tile: ['#e6ecfa', '#9fb3d9', '#b9c8e6'],
    pal: { h: '#3f6fd1', w: '#f1f3fa', g: '#f2b632', G: '#c98a1e', r: '#d6433a', d: '#2a3a7a', y: '#e6b84a', n: '#5b86e0', k: '#8a5a2b', q: '#e8e2d0',
      e: '#1c1c30', i: '#3fae6a', u: '#d6433a', v: '#2a3a7a', m: '#d6433a' },
    rows: ['.9 h3 .10', '.7 h6 .9', '.5 h9 .8', '.4 h11 .7', '.4 h12 .6', '.4 w5 h8 .5', '.4 w5 h8 .5', '.1 g3 w5 h8 .5', '.2 g2 w5 h8 .5', '.3 G1 w5 h8 .5',
      '.4 w5 h7 .6', '.5 w4 h6 .7', '.6 r7 .9',
      '.5 r10 .7', '.5 d8 r2 .7', '.5 d8 .1 r2 .6', '.5 d8 .9', '.5 d2 y3 d3 .9', '.5 d8 .9', '.5 r8 .9', '.5 d8 .9', '.5 n8 .9', '.5 n8 .9', '.5 n8 .9', '.6 n7 .9',
      ...Array(5).fill('.6 h3 .1 h3 .9'), ...Array(4).fill('.7 g1 .3 g1 .10'), '.6 g2 .2 g2 .10', '.4 g4 .1 g4 .9'],
    cells: [[5, 5, 'v'], [5, 6, 'v'], [8, 7, 'u'], [0, 9, 'n'], [1, 8, 'n'], ...col(14, 16, 27, 'k'), ...col(13, 17, 26, 'q'), [15, 15, 'k'], [28, 15, 'k']],
    eyes: [[6, 6, 'e'], [7, 6, 'i']], happy: [[7, 5, 'e'], [6, 6, 'e'], [7, 7, 'e']], shine: SHINE, arm: { s: 'h', h: 'w' } }),
  urbosa: make({ name: '乌尔波扎（荒野之息）', biome: 'desert', bg: { dark: '#2a180c', light: '#f4e6d2' }, tile: ['#d9b24a', '#a67c2e', '#bf9238'],
    pal: { h: '#c63b2c', y: '#e9bf3e', s: '#a8693f', g: '#2a9a86', a: '#2f5fbf', q: '#2b8a8a', k: '#d8dde6',
      e: '#1d1410', i: '#3c9a5a', u: blush('#a8693f'), v: '#7a2018', m: '#6e2a20' },
    rows: ['.9 h3 .10', '.8 y5 .9', '.5 h9 .8', '.4 h11 .7', '.4 h12 .6', '.4 h1 s5 h7 .5', '.4 s6 h7 .5', '.4 s6 y1 h7 .4', '.3 s7 y1 h7 .4',
      '.4 s6 h8 .4', '.4 s6 h8 .4', '.5 s5 h8 .4', '.7 y3 h8 .4',
      '.6 y6 .1 h5 .4', '.5 g8 h5 .4', '.5 g8 h4 .5', '.5 g8 h3 .6', '.5 s8 h2 .7', '.5 s8 .9', '.5 a8 .9', '.5 y8 .9', '.5 q8 .9', '.4 q9 .9', '.4 q9 .9', '.4 q9 .9',
      ...Array(7).fill('.5 q4 .1 q4 .8'), '.6 y3 .1 y3 .9', '.6 s3 .1 s3 .9', '.6 s3 .1 s3 .9', '.4 y5 .1 y4 .8'],
    cells: [...FACE, [4, 4, 'y'], [20, 13, 'y'], [21, 13, 'k'], [22, 14, 'k'], [23, 14, 'k'], [24, 14, 'k'], [25, 14, 'k'], [26, 14, 'k'], [27, 13, 'k']],
    shine: SHINE, arm: { s: 's', h: 's' } }),
  daruk: make({ name: '达尔克尔（荒野之息）', biome: 'volcano', bg: { dark: '#28140e', light: '#f3ddd2' }, tile: ['#8a5a3c', '#5a3a28', '#6e4630'], tex: 'W', cx: 9,
    pal: { W: '#eeeeee', s: '#a66a43', B: '#c99566', a: '#3a7ed1', k: '#6b4a32', R: '#7a4a2e', n: '#8a5232',
      e: '#1e120c', i: '#3a2418', u: blush('#a66a43'), v: '#f4f4f4', m: '#4a1c12' },
    rows: ['.7 W7 .8', '.5 W10 .7', '.4 W12 .6', '.3 W14 .5', '.3 s4 W10 .5', '.3 s6 W8 .5', '.3 s8 W6 .5', '.2 s10 W4 .6', '.2 s11 W3 .6', '.3 s11 W2 .6',
      '.3 s11 .8', '.3 s10 .9', '.4 s9 .9',
      '.3 s12 .7', '.2 s14 .6', '.2 s14 .6', '.2 B7 s7 .6', '.2 B7 s7 .6', '.2 B7 s7 .6', '.2 a14 .6', '.2 a14 .6', '.3 k12 .7', '.3 k12 .7', '.3 k12 .7', '.4 k10 .8',
      ...Array(10).fill('.4 s5 .1 s5 .7'), '.2 s7 .1 s5 .7'],
    cells: [[6, 4, 'v'], [6, 5, 'v'], [6, 6, 'v'], [6, 7, 'v'], [8, 2, 'n'], [9, 8, 'u'], [12, 13, 'R'], [13, 15, 'R'], [14, 16, 'R'], [15, 16, 'R'], [16, 16, 'R'], [17, 16, 'R'], [11, 13, 'R']],
    happy: [[8, 5, 'e'], [7, 6, 'e'], [8, 7, 'e'], [11, 3, 'm'], [11, 4, 'm'], [11, 5, 'm'], [11, 6, 'm']],
    shine: [[1, 7], [1, 8], [2, 6], [2, 7]], arm: { sc: 7, w: 3, s: 's', h: 's' } }),
  sage: make({ name: '神秘老人（荒野之息）', biome: 'ruins', bg: { dark: '#211b14', light: '#ede6d8' }, tile: ['#6fae4a', '#7a5a3a', '#5a4128'], tex: 'cW',
    pal: { c: '#5d5246', W: '#e8e6e1', s: '#e8b48f', b: '#b08a4a', d: '#7a5a3c', D: '#5a3f28', f: '#4a3424', k: '#8a6238',
      e: '#2b2020', i: '#4a3a30', u: blush('#e8b48f'), v: '#f4f2ee', m: '#2b2020' },
    rows: ['.8 c5 .9', '.6 c8 .8', '.5 c10 .7', '.4 c11 .7', '.4 c12 .6', '.4 c2 s3 c7 .6', '.4 s5 c7 .6', '.4 s5 c7 .6', '.3 s6 c7 .6', '.3 W6 c7 .6',
      '.3 W6 c7 .6', '.3 W5 c7 .7', '.3 W5 c7 .7', '.3 W4 c8 .7', '.4 W3 c8 .7', '.4 W2 c9 .7',
      '.5 c8 .9', '.5 c8 .9', '.5 c8 .9', '.5 b8 .9', '.5 c8 .9', '.5 c8 .9', '.5 c8 .9', '.5 c8 .9',
      ...Array(10).fill('.4 d9 .9'), '.5 f4 .1 f3 .9', '.3 f5 .1 f4 .9'],
    cells: [[6, 5, 'v'], [6, 6, 'v'], [8, 7, 'u'], ...col(16, 1, 35, 'k'), [0, 16, 'k'], [0, 17, 'k'], [1, 17, 'k'], ...col(9, 24, 33, 'D')],
    eyes: [[7, 6, 'e']], happy: [[8, 5, 'e'], [7, 6, 'e'], [8, 7, 'e']], shine: false, arm: { s: 'c', h: 's' } }),
};
module.exports = { CH };
