'use strict';
// Festival calendar: picks a themed mascot for major world festivals (dates computed, UTC+8).
// Usage: node scripts/festivals.js [outDir]   -> writes every festival design to outDir
const fs = require('fs');
const path = require('path');
const M = require('./mascots');
const { W, H, PX, MONO, TH, RX, sprite, kf, inv, gate, typed, bubble, bubbleW, bubbleText, sparkles, render, setPal } = M;

// ---------------------------------------------------------------- dates
const DAY = 86400000;
const dn = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
const localDay = now => Math.floor((now.getTime() + 8 * 3600e3) / DAY); // day number in UTC+8
const FMT = {};
function calParts(cal, n) {
  const f = FMT[cal] || (FMT[cal] = new Intl.DateTimeFormat('en-u-ca-' + cal, { month: cal === 'hebrew' ? 'long' : 'numeric', day: 'numeric', timeZone: 'UTC' }));
  const p = f.formatToParts(new Date(n * DAY + 12 * 3600e3));
  return { m: p.find(x => x.type === 'month').value, d: +p.find(x => x.type === 'day').value };
}
function findCal(year, cal, m, d) { // every Gregorian day in `year` whose `cal` date is month m / day d
  const out = [];
  for (let n = dn(year, 1, 1); n <= dn(year, 12, 31); n++) { const p = calParts(cal, n); if (p.m === String(m) && p.d === d) out.push(n); }
  return out;
}
function moons(year, full) { // local day numbers of new (or full) moons around `year` (Meeus, mean + main terms)
  const r = Math.PI / 180, out = [];
  const k0 = Math.floor((year - 2000) * 12.3685) - 2;
  for (let i = 0; i < 17; i++) {
    const k = k0 + i + (full ? 0.5 : 0), T = k / 1236.85, E = 1 - 0.002516 * T;
    const Mm = (2.5534 + 29.1053567 * k) * r, Mp = (201.5643 + 385.81693528 * k) * r, F = (160.7108 + 390.67050284 * k) * r;
    const c = full ? [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209] : [-0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208];
    const jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T + c[0] * Math.sin(Mp) + c[1] * E * Math.sin(Mm) + c[2] * Math.sin(2 * Mp) +
      c[3] * Math.sin(2 * F) + c[4] * E * Math.sin(Mp - Mm) + c[5] * E * Math.sin(Mp + Mm) + c[6] * E * E * Math.sin(2 * Mm);
    out.push(Math.floor(((jde - 2440587.5) * DAY + 8 * 3600e3) / DAY));
  }
  return out;
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return dn(y, mo, da);
}
const thanksgiving = y => { const dow = new Date(Date.UTC(y, 10, 1)).getUTCDay(); return dn(y, 11, 1 + ((4 - dow + 7) % 7) + 21); };
const between = (list, a, b) => list.filter(n => n >= a && n <= b);

// ---------------------------------------------------------------- effects
function rng(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const FX_CSS = `
.fl,.fr{animation-iteration-count:infinite;animation-timing-function:steps(28,end)}
.fl{animation-name:flFall}.fr{animation-name:flRise}
@keyframes flFall{0%{transform:translate(0,-12px)}100%{transform:translate(10px,150px)}}
@keyframes flRise{0%{transform:translate(0,150px)}100%{transform:translate(10px,-24px)}}
.gw rect{animation:flick .9s step-end infinite}
@keyframes flick{0%{fill:#ffd23f}34%{fill:#ffb703}67%{fill:#ffe066}}
.bd{animation-iteration-count:infinite;animation-timing-function:step-end}
.tw{animation:twk 1.6s ease-in-out infinite}@keyframes twk{0%,100%{opacity:.3}50%{opacity:1}}
.hb{animation:hbFly 9s linear infinite}@keyframes hbFly{0%{transform:translateX(-40px)}100%{transform:translateX(440px)}}
.hA{animation:hAB .5s step-end infinite}.hB{animation:hBA .5s step-end infinite}@keyframes hAB{0%{opacity:1}50%{opacity:0}}@keyframes hBA{0%{opacity:0}50%{opacity:1}}
.gh{animation:ghost 6s ease-in-out infinite}@keyframes ghost{0%,100%{transform:translate(0,0);opacity:.55}50%{transform:translate(8px,-10px);opacity:.9}}
` + [...Array(16)].map((_, i) => {
  const ang = (i % 8) * 45 + (i >= 8 ? 22.5 : 0) , rad = i >= 8 ? 22 : 38, dx = Math.round(rad * Math.cos(ang * Math.PI / 180)), dy = Math.round(rad * Math.sin(ang * Math.PI / 180));
  return `.b${i}{animation-name:b${i}}@keyframes b${i}{0%{transform:translate(0,0);opacity:1;animation-timing-function:steps(6,end)}35%{transform:translate(${dx}px,${dy}px);opacity:0}100%{transform:translate(${dx}px,${dy}px);opacity:0}}`;
}).join('');

function drift(kind, n, colors, size, x0, x1, seed, durMin = 4, durMax = 8) { // falling / rising specks
  const rnd = rng(seed); let o = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + rnd() * (x1 - x0)), d = (durMin + rnd() * (durMax - durMin)).toFixed(1), dl = (rnd() * 8).toFixed(1);
    o += `<rect class="${kind}" style="animation-duration:${d}s;animation-delay:-${dl}s" x="${x}" y="0" width="${size}" height="${size}" fill="${colors[i % colors.length]}"/>`;
  }
  return o;
}
function sprites(kind, n, rows, x0, x1, seed, px = 3, durMin = 6, durMax = 10) { // rising/falling sprites (lanterns, hearts)
  const rnd = rng(seed); let o = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + rnd() * (x1 - x0)), d = (durMin + rnd() * (durMax - durMin)).toFixed(1), dl = (rnd() * 10).toFixed(1);
    o += `<g class="${kind}" style="animation-duration:${d}s;animation-delay:-${dl}s"><g transform="translate(${x},0)">${sprite(rows, 0, 0, px)}</g></g>`;
  }
  return o;
}
function burst(x, y, colors, dur, delay) {
  let o = `<g transform="translate(${x},${y})">`;
  for (let i = 0; i < 16; i++) o += `<rect class="bd b${i}" style="animation-duration:${dur}s;animation-delay:-${delay}s" x="-2" y="-2" width="4" height="4" fill="${colors[i % colors.length]}"/>`;
  return o + '</g>';
}
function disc(cx, cy, r, px, color, cut) { // pixel disc (optionally with a bite taken out -> crescent)
  let o = '';
  for (let y = -r; y <= r; y++) {
    let x0 = null;
    for (let x = -r; x <= r + 1; x++) {
      const ins = x <= r && x * x + y * y <= r * r + r && !(cut && (x - cut[0]) ** 2 + (y - cut[1]) ** 2 <= cut[2] ** 2);
      if (ins && x0 === null) x0 = x;
      if (!ins && x0 !== null) { o += `<rect x="${cx + x0 * px}" y="${cy + y * px}" width="${(x - x0) * px}" height="${px}" fill="${color}"/>`; x0 = null; }
    }
  }
  return o;
}
const HEART = ['.R.R.', 'RRRRR', '.RRR.', '..R..'], LANTERN = ['.YY.', 'RRRR', 'RYYR', 'RRRR', '.YY.'];

// ---------------------------------------------------------------- costumes
const HATS = {
  santa: ['......RRRW......', '....RRRRRRRR....', '...WWWWWWWWWW...'],
  party: ['.......YY.......', '......BBBB......', '.....PPPPPP.....'],
  bunny: ['....WW....WW....', '....WP....PW....', '....WP....PW....'],
  mandarin: ['.......YY.......', '.....RRRRRR.....', '....RRRRRRRR....'],
  kufi: ['................', '.....WWWWWW.....', '....WWGGGGWW....'],
  pilgrim: ['.....KKKKKK.....', '.....KKYYKK.....', '...KKKKKKKKKK...'],
  kippah: ['................', '................', '.....ZZZZZZ.....'],
  witch: ['.......KK.......', '.....KKKKKK.....', '..KKKKPPPPKKKK..'],
};
const HELD = { // drawn left of the robot's left arm (cols < 0)
  envelope: sprite(['RRR', 'RYR', 'RRR', 'RRR'], 4, -3),
  heart: sprite(HEART, 4, -5),
  gift: sprite(['.Y.Y.', 'RRYRR', 'RRYRR', 'RRYRR'], 4, -5),
  mooncake: sprite(['.ccc.', 'cQQQc', 'cQQQc', '.ccc.'], 4, -5),
  basket: sprite(['.PBY.', 'NNNNN', '.NNN.'], 5, -5),
  pumpkin: sprite(['..N..', 'QQQQQ', 'QYQYQ', '.QQQ.'], 4, -5),
  fanous: sprite(['..Y..', '.RRR.', 'RYYYR', 'RYYYR', '.RRR.'], 3, -5),
};

const { CH } = require('./characters');
const CHARS = Object.keys(CH).filter(k => CH[k].hd); // the six Breath-of-the-Wild pixel characters wear the festival costumes
// each festival has its own fixed character (round-robin over the character list)
const charFor = id => CH[id === 'halloween' ? 'revali' : CHARS[Object.keys(FEST).indexOf(id) % CHARS.length]];

const FEST = {
  hello: { text: 'Hello, world!', bg: null, fx: () => '' },
  newyear: { text: 'Happy New Year!', bg: { dark: '#1a1a2e', light: '#dfe3f5' }, hat: 'party',
    fx: () => drift('fl', 30, ['#facc15', '#f08fa8', '#5ec8e5', '#4ade80', '#ffffff'], 5, 30, 930, 11) +
      burst(120, 52, ['#facc15', '#ff6b9d'], 3.4, 0) + burst(300, 40, ['#5ec8e5', '#ffffff'], 3.4, 1.1) + burst(470, 56, ['#4ade80', '#facc15'], 3.4, 2.2) },
  lunar: { text: '新年快乐!', bg: { dark: '#3b1212', light: '#f4d6d0' }, hat: 'mandarin', held: 'envelope',
    fx: () => sprites('fr', 9, LANTERN, 30, 900, 5, 4, 7, 12) + burst(200, 46, ['#facc15', '#ff6b4a'], 4, 0) + burst(430, 58, ['#facc15', '#ffffff'], 4, 2) },
  valentine: { text: 'Happy Valentine!', bg: { dark: '#3a1626', light: '#f6d9e4' }, held: 'heart',
    fx: () => sprites('fr', 14, HEART, 30, 900, 9, 3, 6, 11) },
  holi: { text: 'Happy Holi!', bg: { dark: '#2a2140', light: '#e6dcf5' }, splash: true,
    fx: () => burst(90, 56, ['#f08fa8', '#facc15', '#5ec8e5', '#4ade80'], 2.6, 0) + burst(230, 38, ['#8957e5', '#f08fa8', '#facc15'], 2.6, .9) +
      burst(370, 62, ['#4ade80', '#5ec8e5', '#f08a24'], 2.6, 1.7) + burst(510, 44, ['#f08fa8', '#8957e5', '#facc15'], 2.6, .4) },
  easter: { text: 'Happy Easter!', bg: { dark: '#26332a', light: '#dcecd9' }, hat: 'bunny', held: 'basket', eggs: true,
    fx: () => drift('fl', 20, ['#f08fa8', '#93c5fd', '#facc15', '#b392f0', '#4ade80'], 5, 30, 930, 21, 7, 12) },
  eid: { text: 'Eid Mubarak!', bg: { dark: '#10263a', light: '#d3e6f0' }, hat: 'kufi', held: 'fanous',
    fx: () => disc(90, 46, 5, 5, '#fcd34d', [3, -2, 5]) + sprite(['..Y..', '.YYY.', 'YYYYY', '.YYY.', '..Y..'], 3, 150, 4) + sprites('fr', 7, LANTERN, 200, 700, 3, 4, 8, 13) },
  midautumn: { text: '中秋快乐!', bg: { dark: '#1a1f3d', light: '#dfe0f2' }, held: 'mooncake',
    fx: () => `<g opacity=".25">${disc(135, 52, 8, 5, '#fff3c4')}</g>` + disc(135, 52, 6, 5, '#fff3c4') + sprites('fr', 7, LANTERN, 260, 700, 8, 4, 8, 13) },
  diwali: { text: 'Happy Diwali!', bg: { dark: '#2b1a0a', light: '#f5e3c8' }, diyas: true,
    fx: () => burst(110, 50, ['#facc15', '#f08a24'], 3.6, 0) + burst(290, 36, ['#ef5b6b', '#facc15'], 3.6, 1.2) + burst(470, 54, ['#f08a24', '#ffffff'], 3.6, 2.4) +
      sprites('fr', 5, LANTERN, 560, 700, 4, 4, 9, 14) },
  thanksgiving: { text: 'Happy Thanksgiving!', bg: { dark: '#33220f', light: '#efdcc0' }, hat: 'pilgrim',
    fx: () => drift('fl', 26, ['#f08a24', '#c2620f', '#facc15', '#ef5b6b'], 6, 30, 930, 31, 6, 11) },
  christmas: { text: 'Merry Christmas!', bg: { dark: '#12301f', light: '#d6ecdc' }, hat: 'santa', held: 'gift', tree: true,
    fx: th => drift('fl', 40, [th === 'light' ? '#8fa8c0' : '#ffffff'], 4, 20, 940, 41, 5, 9) },
  halloween: { text: 'Trick or treat!', bg: { dark: '#22142f', light: '#e8dcf3' }, hat: 'witch', held: 'pumpkin',
    fx: () => disc(630, 40, 5, 5, '#fff3c4') + [24,52,80].map((y,i)=>`<g transform="translate(560,${y})"><g class="hb" style="animation-duration:${8+i*2}s;animation-delay:-${i*3}s"><g class="hA">${sprite(['U.....U','UU.U.UU','.UUUUU.','..U.U..'],0,0,3)}</g><g class="hB">${sprite(['..U.U..','.UUUUU.','UU.U.UU','U.....U'],0,0,3)}</g></g></g>`).join('') + [580,640,700,760].map((x,i)=>`<g transform="translate(${x},${122-(i%2?12:15)})"><g class="gw">${sprite(['..N..','.QQQ.','QYQYQ','QQQQQ','.QQQ.'],0,0,i%2?2:3)}</g></g>`).join('') + sprites('gh', 3, ['.WWW.','WKWKW','WWWWW','WWWWW','W.W.W'], 600, 900, 17, 3, 5, 7).replace(/class="gh"/g,'class="gh" opacity=".7"') },
  hanukkah: { text: 'Happy Hanukkah!', bg: { dark: '#10203d', light: '#d8e2f5' }, hat: 'kippah', menorah: true,
    fx: () => '' },
};

function menorah(night) {
  const px = 6, cols = [0, 2, 4, 6, 10, 12, 14, 16], lit = cols.slice(8 - Math.min(Math.max(night, 1), 8));
  const body = sprite([
    '........Z........', '........Z........', 'Z.Z.Z.Z.Z.Z.Z.Z.Z', 'YYYYYYYYYYYYYYYYY', '........Y........', '........Y........', '......YYYYY......', '....YYYYYYYYY....',
  ], 1, 0, px).replace(/^/, '');
  let flames = `<rect x="${8 * px}" y="0" width="${px}" height="${px}" fill="#ffd23f"/>`;
  lit.forEach(c => { flames += `<rect x="${c * px}" y="${2 * px}" width="${px}" height="${px}" fill="#ffd23f"/>`; });
  return `<g transform="translate(400,${122 - 9 * px})">${body}<g class="gw">${flames}</g></g>`;
}

// 2D-game ground strip: grass/stone top row + brick row with a checker pattern
function tiles([a, b, d]) {
  let o = `<rect x="0" y="123" width="${W}" height="8" fill="${a}"/><rect x="0" y="131" width="${W}" height="9" fill="${b}"/>`;
  for (let x = 0; x < W; x += 16) o += `<rect x="${x}" y="131" width="8" height="8" fill="${d}"/><rect x="${x + 8}" y="123" width="4" height="4" fill="${b}" opacity=".35"/>`;
  return o;
}

// extra decor for the pixel characters: twinkling string lights across the top and small props on the ground (visible header area is x >= 560)
const LIGHTS = { newyear: ['#facc15', '#ff6b9d', '#5ec8e5'], lunar: ['#ff4a3a', '#facc15'], valentine: ['#ff6b9d', '#ffffff'], holi: ['#f08fa8', '#facc15', '#5ec8e5', '#4ade80'], easter: ['#f08fa8', '#93c5fd', '#facc15'], eid: ['#fcd34d', '#ffffff'], midautumn: ['#fff3c4', '#f6c453'], diwali: ['#ffb347', '#ff6b3a', '#facc15'], thanksgiving: ['#f08a24', '#facc15'], christmas: ['#ef4444', '#4ade80', '#facc15', '#60a5fa'], hanukkah: ['#60a5fa', '#ffffff'] };
function lights(id, theme) {
  const cols = LIGHTS[id] || ['#facc15'], pts = [];
  for (let i = 0; i < 24; i++) { const x = 572 + i * 16.5, y = 4 + 5 * Math.abs(Math.sin(i * Math.PI / 6)); pts.push([x, y]); }
  const wire = 'M' + pts.map(p => p.join(' ')).join('L');
  return `<path d="${wire}" fill="none" stroke="${theme === 'dark' ? '#556' : '#889'}" stroke-width="1" opacity=".7"/>` +
    pts.map(([x, y], i) => `<g class="tw" style="animation-delay:-${(i * 0.37).toFixed(2)}s"><rect x="${x - 1.5}" y="${y}" width="3" height="4" fill="${cols[i % cols.length]}"/></g><rect x="${x - 4}" y="${y - 3}" width="8" height="10" fill="${cols[i % cols.length]}" opacity=".12"/>`).join('');
}
function ground(id, theme) {
  const cols = LIGHTS[id] || ['#facc15'], r = rng(id.length * 31 + 5);
  let o = '';
  for (let i = 0; i < 18; i++) { // confetti / petals resting on the ground
    const x = Math.round(570 + r() * 380); if (x > 840 && x < 950) continue;
    o += `<rect x="${x}" y="${120 + Math.round(r() * 3)}" width="${r() > .5 ? 3 : 2}" height="2" fill="${cols[i % cols.length]}"/>`;
  }
  return o;
}
function scene(theme, id, ctx = {}) {
  const cfg = FEST[id], t = TH[theme]; const R = ctx.char || M.ROBOT; setPal(Object.assign({}, ctx.pal, R.pal));
  const C = 10, ty = typed('f', cfg.text, 10, 1.3, 88, C), bw = bubbleW(cfg.text);
  const css = [
    FX_CSS,
    gate('fDown', inv([[8, 40]])).css, gate('fUp1', [[8, 12], [16, 20], [24, 28], [32, 36]]).css, gate('fUp2', [[12, 16], [20, 24], [28, 32], [36, 40]]).css,
    gate('fHappy', [[8, 88]]).css, gate('fCalm', inv([[8, 88]])).css, gate('fBub', [[8, 88]]).css,
    kf('fHop', [[8, 10]], 'transform', 'translateY(-8px)', 'translateY(0)') + '.fHop{animation-name:fHop}',
    ty.css,
  ].join('\n');
  const bx = cfg.held ? 44 : 0, bR = R.bubbleR != null ? R.bubbleR : RX - 16, bY = R.bubbleY != null ? R.bubbleY : 34;
  const hat = cfg.hat ? (R.hd ? sprite(HATS[cfg.hat], R.hatY / 2 - 3, 41, 2) : sprite(HATS[cfg.hat], R.hatRow, R.hatCol)) : '';
  const splash = cfg.splash ? sprite(['', '', '...PP...........', '...PP......GG...', '', '.........BB.....', '..YY......PP....', '.......VV...GG..', '....BB..........'], 1) : '';
  const eggs = cfg.eggs ? [[60, '#f08fa8'], [160, '#93c5fd'], [270, '#facc15'], [390, '#b392f0'], [510, '#4ade80']].map(([x, col]) =>
    `<g transform="translate(${x},106)"><rect x="3" y="0" width="6" height="3" fill="${col}"/><rect x="0" y="3" width="12" height="9" fill="${col}"/><rect x="3" y="12" width="6" height="3" fill="${col}"/><rect x="3" y="6" width="6" height="2" fill="#ffffff" opacity=".7"/></g>`).join('') : '';
  const diyas = cfg.diyas ? [50, 120, 190, 260, 330, 400, 470, 540].map(x =>
    `<g transform="translate(${x},0)"><rect x="0" y="116" width="15" height="3" fill="#6b4a2b"/><rect x="3" y="119" width="9" height="3" fill="#6b4a2b"/><g class="gw"><rect x="6" y="107" width="3" height="6" fill="#ffd23f"/></g></g>`).join('') : '';
  const tree = cfg.tree ? `<g transform="translate(70,${122 - 8 * 6})">${sprite(['....Y....', '...TTT...', '..TTRTT..', '...TTT...', '..TTBTT..', '.TTTTTTT.', '....N....', '....N....'], 0, 0, 6)}</g>` : '';
  const hd = id === 'hello' && R.backdrop;
  const inner = (hd ? R.backdrop(theme) : sparkles(t, [[60, 40, 2.6, 0], [330, 30, 3, 2.2], [450, 96, 2.2, .6]])) +
    (R.hd ? lights(id, theme) + `<g transform="translate(470,0)">${tree + diyas + eggs}</g><g transform="translate(220,0)">${cfg.menorah ? menorah(ctx.night || 1) : ''}</g>` + cfg.fx(theme) + `<g transform="translate(500,0)">${cfg.fx(theme)}</g>` + ground(id, theme)
      : tree + diyas + eggs + (cfg.menorah ? menorah(ctx.night || 1) : '') + cfg.fx(theme)) +
    `<g transform="translate(${RX},26)"><g class="a fHop">` + (cfg.hat ? '' : R.antenna) + R.body(true) + R.legs + splash + hat +
    `<g class="a fDown">${R.armDown}</g><g class="alt a fUp1">${R.up1}</g><g class="alt a fUp2">${R.up2}</g>` +
    `<g class="a fCalm"><g class="eyes">${R.eyes}</g></g><g class="alt a fHappy">${R.happy}</g>` +
    (cfg.held ? (R.hd ? `<g transform="translate(${98 + 24},52) scale(.4)">` : `<g transform="translate(0,${R.holdDy * PX})">`) + (cfg.held === 'fanous' ? `<g class="gw">${HELD[cfg.held]}</g>` : HELD[cfg.held]) + '</g>' : '') +
    `</g></g>` + (hd && R.front ? R.front(theme) : '') +
    `<g class="alt a fBub">${bubble(t, bR - bx, bY, bw, 50)}${bubbleText(t, bR - bx - bw + 22, bY + 26, ty.spans)}</g>`;
  const tl = R.tile && id === 'hello' ? tiles(R.tile) : '';
  return render(theme, C, css, inner, { ground: tl });
}

// ---------------------------------------------------------------- calendar
const HALLOWEEN_BG = { dark: '#22142f', light: '#e8dcf3' };
const festivals = [ // earlier entries win when windows overlap
  { id: 'newyear', ranges: y => [[dn(y, 12, 31), dn(y + 1, 1, 2)]] },
  { id: 'lunar', ranges: y => findCal(y, 'chinese', 1, 1).map(n => [n - 1, n + 6]) },
  { id: 'valentine', ranges: y => [[dn(y, 2, 13), dn(y, 2, 14)]] },
  { id: 'holi', ranges: y => between(moons(y, true), dn(y, 2, 24), dn(y, 3, 28)).map(n => [n, n + 1]) },
  { id: 'easter', ranges: y => [[easter(y) - 2, easter(y) + 1]] },
  { id: 'eid', ranges: y => [...findCal(y, 'islamic-umalqura', 10, 1), ...findCal(y, 'islamic-umalqura', 12, 10)].map(n => [n - 1, n + 2]) },
  { id: 'midautumn', ranges: y => findCal(y, 'chinese', 8, 15).map(n => [n - 1, n + 1]) },
  { id: 'diwali', ranges: y => between(moons(y, false), dn(y, 10, 17), dn(y, 11, 16)).map(n => [n - 2, n + 2]) },
  { id: 'halloween', ranges: y => [[dn(y, 10, 24), dn(y, 11, 1)]] },
  { id: 'thanksgiving', ranges: y => [[thanksgiving(y) - 1, thanksgiving(y) + 1]] },
  { id: 'christmas', ranges: y => [[dn(y, 12, 23), dn(y, 12, 26)]] },
  { id: 'hanukkah', ranges: y => findCal(y, 'hebrew', 'Kislev', 25).map(n => [n, n + 7]) },
];

const DRAW = Object.assign({}, ...Object.keys(FEST).map(id => ({ [id]: (theme, ctx) => scene(theme, id, Object.assign({ char: charFor(id) }, ctx)) })));

// today's festival, or null. Returns { id, draw(theme) }
function pick(now = new Date()) {
  const today = localDay(now), y = new Date(today * DAY).getUTCFullYear();
  for (const f of festivals) {
    for (const yy of [y - 1, y, y + 1]) {
      for (const [s, e] of f.ranges(yy)) if (today >= s && today <= e) { const ctx = { night: today - s + 1 }; return { id: f.id, bg: (FEST[f.id] || {}).bg || HALLOWEEN_BG, draw: theme => DRAW[f.id](theme, ctx) }; }
    }
  }
  return null;
}

const hello = (theme, k) => scene(theme, 'hello', { char: CH[k] });
module.exports = { HALLOWEEN_BG, pick, DRAW, festivals, FEST, CHARS, hello };

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'mascots');
  fs.mkdirSync(out, { recursive: true });
  for (const id of Object.keys(DRAW)) for (const theme of ['dark', 'light']) fs.writeFileSync(path.join(out, `fest-${id}.${theme}.svg`), DRAW[id](theme, { night: 3 }));
  console.log('wrote', Object.keys(DRAW).join(', '));
}
