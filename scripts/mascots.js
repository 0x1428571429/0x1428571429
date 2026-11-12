'use strict';
// Pixel mascot designs (animated SVG, pure CSS, works inside <img> on GitHub).
// Usage: node scripts/mascots.js [outDir]   -> writes <name>.<theme>.svg for every design.
const fs = require('fs');
const path = require('path');

const W = 960, H = 140, PX = 8;
const MONO = "ui-monospace,Menlo,Consolas,monospace";
const PAL = {
  O: '#d97757', D: '#b05a3e', K: '#1c1c1c', W: '#ffffff', B: '#5ec8e5', G: '#4ade80',
  R: '#ef5b6b', Y: '#facc15', C: '#f1dcb8', c: '#cda878', P: '#f08fa8', F: '#5a5a5a', S: '#101a14', Q: '#f08a24', q: '#c2620f', N: '#6b4a2b', T: '#3f9b4a', Z: '#3b82f6', X: '#93c5fd', V: '#8957e5', U: '#6e40c9', L: '#b392f0',
};
const TH = {
  dark: { gray: '#111111', line: '#2a2a2a', edge: '#5a5a5a', panel: '#1c1c1c', text: '#e8e8e8', dim: '#8c8c8c' },
  light: { gray: '#f5f5f5', line: '#e0e0e0', edge: '#b5b5b5', panel: '#ffffff', text: '#2f3437', dim: '#6b6b6b' },
};

// ---------- daily colour theme: derive every token (text, dim, border...) from one background colour, with contrast checks ----------
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex2(a), B = hex2(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = h => { const c = hex2(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function tokens(bg, mode) {
  const dark = mode === 'dark', ink = dark ? '#ffffff' : '#000000';
  const text = mix(bg, ink, dark ? .92 : .86);
  let dim = mix(text, bg, .35);
  for (let i = 0; i < 10 && contrast(dim, bg) < 4.6; i++) dim = mix(dim, text, .2);
  const border = mix(bg, ink, dark ? .16 : .12);
  return { bg, gray: bg, text, dim, border, line: border, edge: mix(bg, ink, dark ? .38 : .32), panel: dark ? mix(bg, '#ffffff', .07) : mix(bg, '#ffffff', .7) };
}
function useTheme(bgPair) { for (const m of ['dark', 'light']) Object.assign(TH[m], tokens(bgPair[m], m)); }
let CUR = PAL; // active sprite palette
function setPal(extra) { CUR = Object.assign({}, PAL, extra || {}); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- helpers ----------
function sprite(rows, row0 = 0, col0 = 0, px = PX) {
  let o = '';
  rows.forEach((s, r) => {
    let c = 0;
    while (c < s.length) {
      const ch = s[c];
      if (ch === '.') { c++; continue; }
      let e = c;
      while (e < s.length && s[e] === ch) e++;
      o += `<rect x="${(c + col0) * px}" y="${(r + row0) * px}" width="${(e - c) * px}" height="${px}" fill="${CUR[ch]}"/>`;
      c = e;
    }
  });
  return o;
}

// keyframes where `prop` is `on` inside the given [start,end] percent intervals, else `off`
function kf(name, ivs, prop = 'opacity', on = '1', off = '0') {
  const first = ivs.some(([a]) => a === 0);
  let s = `@keyframes ${name}{0%{${prop}:${first ? on : off}}`;
  ivs.forEach(([a, b]) => {
    if (a > 0) s += `${a}%{${prop}:${on}}`;
    if (b < 100) s += `${b}%{${prop}:${off}}`;
  });
  return s + '}';
}
const inv = ivs => { // complement of intervals over 0..100
  const out = []; let p = 0;
  ivs.slice().sort((x, y) => x[0] - y[0]).forEach(([a, b]) => { if (a > p) out.push([p, a]); p = b; });
  if (p < 100) out.push([p, 100]);
  return out;
};
// gate a group on/off over the loop: class name -> animation
function gate(name, ivs) { return { css: `.${name}{animation-name:${name}}` + kf(name, ivs), cls: `a ${name}` }; }

function typed(prefix, text, t0, step, tEnd, cycle) {
  let css = '';
  const spans = [...text].map((ch, i) => {
    const s = (t0 + i * step).toFixed(2);
    css += `.${prefix}${i}{fill-opacity:0;animation:${prefix}${i} ${cycle}s step-end infinite}@keyframes ${prefix}${i}{0%{fill-opacity:0}${s}%{fill-opacity:1}${tEnd}%{fill-opacity:0}}`;
    return `<tspan class="tc ${prefix}${i}">${ch === ' ' ? ' ' : esc(ch)}</tspan>`;
  });
  return { css, spans: spans.join('') };
}

// pixel speech bubble whose tail points to the right (toward a mascot on its right)
function bubble(t, r, by, bw, bh) {
  const bx = r - bw, mid = by + bh / 2;
  return `<g shape-rendering="crispEdges">` +
    `<path d="M${bx + 4} ${by}H${r - 4}V${by + 4}H${r}V${by + bh - 4}H${r - 4}V${by + bh}H${bx + 4}V${by + bh - 4}H${bx}V${by + 4}H${bx + 4}Z" fill="${t.panel}" stroke="${t.edge}" stroke-width="2"/>` +
    `<path d="M${r} ${mid - 9}H${r + 6}V${mid - 3}H${r + 12}V${mid + 3}H${r + 6}V${mid + 9}H${r}" fill="${t.panel}" stroke="${t.edge}" stroke-width="2"/>` +
    `<rect x="${r - 1}" y="${mid - 8}" width="2" height="16" fill="${t.panel}"/></g>`;
}
const bubbleW = x => Math.round((typeof x === 'string' ? [...x].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 19 : 10.8), 0) : x * 10.8) + 44);
function bubbleText(t, x, y, spans) {
  return `<text x="${x}" y="${y}" font-size="18" font-family="${MONO}" dominant-baseline="central" fill="${t.text}">${spans}</text>`;
}

function sparkles(t, pts) {
  return pts.map(([x, y, d, dl]) =>
    `<path class="tw" style="animation-duration:${d}s;animation-delay:-${dl}s" transform="translate(${x},${y})" d="M3 0h3v3h3v3h-3v3h-3v-3h-3v-3h3z" fill="${t.dim}"/>`).join('');
}

function render(theme, cycle, css, inner, opt = {}) {
  const t = TH[theme];
  const bg = t.gray; // same surface as the other cards (opt.bg is ignored on purpose)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<path d="M0 0H${W}V${H - 6}A6 6 0 0 1 ${W - 6} ${H}H6A6 6 0 0 1 0 ${H - 6}Z" fill="${bg}"/>
<line x1="28" y1="0.5" x2="${W - 28}" y2="0.5" stroke="${t.line}" stroke-width="1"/>
<style>
.a{animation-duration:${cycle}s;animation-iteration-count:infinite;animation-timing-function:step-end}
.eyes{transform-box:fill-box;transform-origin:center;animation:blink 4.7s step-end infinite}
.bulb{fill:#5ec8e5;animation:bulb 1.6s step-end infinite}
.tw{animation:tw 3s step-end infinite}
@keyframes blink{0%{transform:scaleY(1)}90%{transform:scaleY(1)}92%{transform:scaleY(.15)}97%{transform:scaleY(1)}}
@keyframes bulb{0%{fill:#5ec8e5}50%{fill:#2b6a7a}}
@keyframes tw{0%{opacity:.1}50%{opacity:.8}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.tc{fill-opacity:1!important}.alt{display:none!important}}
${css}
</style>
${opt.ground || `<line x1="28" y1="123" x2="932" y2="123" stroke="${t.edge}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="8 8"/>`}
${inner}
</svg>`;
}

// ---------- the robot ----------
const ROBOT = {
  antenna: `<rect class="bulb" x="56" y="0" width="16" height="8"/>` + sprite(['.......DD........'], 1),
  body: (leftArm = true) => {
    const arm = leftArm ? 'OOOOOOOOOOOOOO...' : '..OOOOOOOOOOOO...';
    return sprite([
      '...OOOOOOOOOO....', '..OOOOOOOOOOOO...', '..OOOOOOOOOOOO...', arm, arm,
      '..OOOOOOOOOOOO...', '..OOOOOOOOOOOO...', '...DDDDDDDDDD....',
    ], 2);
  },
  eyes: sprite(['....WK....WK.....', '....KK....KK.....'], 4),
  eyesLeft: sprite(['...WK....WK......', '...KK....KK......'], 4),
  eyesShut: sprite(['....KK....KK.....'], 5),
  happy: sprite(['.....K....K......', '....K.K..K.K.....'], 4) + sprite(['......K..K.......', '.......KK........'], 7),
  mouthO: sprite(['.......KK........'], 8),
  armDown: sprite(['..............OO.', '..............OO.'], 5),
  up1: sprite(Array(4).fill('..............OO.'), 3),
  up2: sprite(['...............OO', '...............OO', '..............OO.', '..............OO.'], 3),
  legs: sprite(['...D.D....D.D....', '...D.D....D.D....'], 10),
  legsA: sprite(['...D.D....D.D....', '..D...D..D...D...'], 10),
  legsB: sprite(['...D.D....D.D....', '....D.D..D.D.....'], 10),
};
const RX = W - 28 - 17 * PX; // robot x when parked bottom-right (796)

// 1) SLEEPY: dozes with floating Zzz, wakes with a "!" and says hi, then dozes again
function sleepy(theme) {
  const t = TH[theme], C = 12, text = 'Oh, hi!';
  const sleep = [[0, 40], [76, 100]], awake = [[40, 76]];
  const ty = typed('s', text, 46, 2, 74, C), bw = bubbleW(text.length);
  const css = [
    gate('sSleep', sleep).css, gate('sAwake', awake).css, gate('sBang', [[40, 52]]).css, gate('sBub', [[44, 76]]).css,
    kf('sHop', [[40, 42]], 'transform', 'translateY(-8px)', 'translateY(0)'), '.sHop{animation-name:sHop}',
    '.zz{opacity:0;animation:zf 3s step-end infinite}',
    '@keyframes zf{0%{opacity:0;transform:translate(0,12px)}20%{opacity:1;transform:translate(-4px,4px)}45%{opacity:1;transform:translate(0,-6px)}70%{opacity:.6;transform:translate(-4px,-16px)}90%{opacity:0}}',
    ty.css,
  ].join('\n');
  const z = (s, dl, x, y) => `<text class="zz" style="animation-delay:-${dl}s" x="${x}" y="${y}" font-size="${s}" font-weight="700" font-family="${MONO}" fill="${t.dim}">z</text>`;
  const inner = sparkles(t, [[60, 40, 2.6, 0], [200, 84, 3.4, 1.1], [330, 30, 3, 2.2], [450, 90, 2.2, .6]]) +
    `<g transform="translate(${RX},26)"><g class="a sHop">` +
    ROBOT.antenna + ROBOT.body(true) + ROBOT.armDown + ROBOT.legs +
    `<g class="${gate('sSleep', sleep).cls}">${ROBOT.eyesShut}${ROBOT.mouthO}</g>` +
    `<g class="alt a sAwake"><g class="eyes">${ROBOT.eyes}</g></g>` +
    `<g class="alt a sBang">${sprite(['..Y', '..Y', '..Y', '...', '..Y'], 0, 15)}</g>` +
    `</g></g>` +
    `<g class="alt a sSleep">${z(14, 0, RX - 6, 62)}${z(18, 1, RX - 14, 52)}${z(22, 2, RX - 22, 42)}</g>` +
    `<g class="alt a sBub">${bubble(t, RX - 16, 34, bw, 50)}${bubbleText(t, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner);
}

// 2) CODER: types on a monitor, build passes, celebrates
function coder(theme) {
  const t = TH[theme], C = 10, text = 'LGTM, ship it!';
  const MX = 680, MY = 34;
  const ty = typed('k', text, 63, 1.1, 90, C), bw = bubbleW(text.length);
  const lines = [[2, 5, '#5ec8e5'], [3, 7, '#d97757'], [2, 4, '#4ade80'], [3, 6, '#8b8b8b']];
  let css = [
    gate('kCode', [[0, 60], [90, 100]]).css, gate('kOk', [[60, 90]]).css, gate('kBub', [[62, 90]]).css,
    gate('kLook', [[0, 60], [90, 100]]).css,
    '.tpA{animation:tpA .5s step-end infinite}.tpB{animation:tpB .5s step-end infinite}',
    kf('tpA', [[0, 50]]), kf('tpB', [[50, 100]]),
    '.ln{transform-box:fill-box;transform-origin:left center}',
    ty.css,
  ].join('\n');
  lines.forEach(([c0, w], i) => {
    const s = 2 + i * 14, e = s + 11;
    css += `\n.l${i}{animation:l${i} ${C}s step-end infinite}@keyframes l${i}{0%{transform:scaleX(0)}${s}%{transform:scaleX(0);animation-timing-function:steps(${w},end)}${e}%{transform:scaleX(1)}90%{transform:scaleX(0)}}`;
  });
  const screen = lines.map(([c0, w, col], i) =>
    `<rect class="ln l${i}" x="${c0 * PX}" y="${(2 * i + 1) * PX + 2}" width="${w * PX}" height="4" fill="${col}"/>`).join('');
  const monitor = sprite([
    'FFFFFFFFFFFFF', ...Array(7).fill('FSSSSSSSSSSSF'), 'FFFFFFFFFFFFF', '.....FFF.....', '...FFFFFFF...',
  ], 0) +
    `<g class="a kCode">${screen}</g>` +
    `<g class="alt a kOk">${sprite(['.........G.', '........GG.', 'G......GG..', 'GG....GG...', '.GG..GG....', '..GGGG.....', '...GG......'], 1, 1)}</g>`;
  const inner = sparkles(t, [[60, 40, 2.6, 0], [180, 84, 3.4, 1.1], [300, 30, 3, 2.2], [400, 90, 2.2, .6]]) +
    `<g transform="translate(${MX},${MY})">${monitor}</g>` +
    `<g transform="translate(${RX},26)">` +
    ROBOT.antenna + ROBOT.body(false) + ROBOT.armDown + ROBOT.legs +
    `<g class="a kLook"><g class="eyes">${ROBOT.eyesLeft}</g>` +
    `<g class="tpA">${sprite(['OO', 'OO'], 6)}</g><g class="tpB">${sprite(['OO', 'OO'], 5)}</g></g>` +
    `<g class="alt a kOk">${ROBOT.happy}${sprite(['OO', 'OO', 'OO', 'OO'], 3)}</g>` +
    `</g>` +
    `<g class="alt a kBub">${bubble(t, MX - 16, 34, bw, 50)}${bubbleText(t, MX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner);
}

// 3) WALKER: strolls in from the left, waves and pings 127.0.0.1, walks back
function walker(theme) {
  const t = TH[theme], C = 16, text = 'ping 127.0.0.1';
  const moving = [[3, 38], [65, 97]], greet = [[40, 64]];
  const ty = typed('w', text, 41, 1.2, 64, C), bw = bubbleW(text.length);
  const css = [
    gate('wMove', moving).css, gate('wStand', inv(moving)).css, gate('wGreet', greet).css, gate('wCalm', inv(greet)).css,
    gate('wDown', inv(greet)).css,
    gate('wUp1', [[40, 44], [48, 52], [56, 60]]).css, gate('wUp2', [[44, 48], [52, 56], [60, 64]]).css,
    kf('wHop', [[38, 40]], 'transform', 'translateY(-8px)', 'translateY(0)'), '.wHop{animation-name:wHop}',
    `.walk{animation:walk ${C}s step-end infinite}@keyframes walk{0%{transform:translateX(0)}3%{transform:translateX(0);animation-timing-function:steps(95,end)}38%{transform:translateX(${RX - 40}px)}65%{transform:translateX(${RX - 40}px);animation-timing-function:steps(95,end)}97%{transform:translateX(0)}}`,
    '.lgA{animation:lgA .5s step-end infinite}.lgB{animation:lgB .5s step-end infinite}', kf('lgA', [[0, 50]]), kf('lgB', [[50, 100]]),
    ty.css,
  ].join('\n');
  const inner = sparkles(t, [[300, 40, 2.6, 0], [430, 84, 3.4, 1.1], [560, 30, 3, 2.2], [120, 90, 2.2, .6]]) +
    `<g transform="translate(40,26)"><g class="walk"><g class="a wHop">` +
    ROBOT.antenna + ROBOT.body(true) +
    `<g class="a wDown">${ROBOT.armDown}</g><g class="alt a wUp1">${ROBOT.up1}</g><g class="alt a wUp2">${ROBOT.up2}</g>` +
    `<g class="a wCalm"><g class="eyes">${ROBOT.eyes}</g></g><g class="alt a wGreet">${ROBOT.happy}</g>` +
    `<g class="a wStand">${ROBOT.legs}</g>` +
    `<g class="alt a wMove"><g class="lgA">${ROBOT.legsA}</g><g class="lgB">${ROBOT.legsB}</g></g>` +
    `</g></g></g>` +
    `<g class="alt a wGreet">${bubble(t, RX - 16, 34, bw, 50)}${bubbleText(t, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner);
}

// 4) CAT: a pixel cat that blinks, wags its tail and meows a heart
function cat(theme) {
  const t = TH[theme], C = 9, text = 'meow~';
  const ty = typed('m', text, 12, 3, 60, C), bw = bubbleW(text.length);
  const head = sprite([
    '..CC........CC..', '..CCCC....CCCC..', '..CCCCCCCCCCCC..', '..CCCCCCCCCCCC..', '..CCCCCCCCCCCC..', '..CCCCCCCCCCCC..',
    '..CCCCCPPCCCCC..', '..CCCCKCCKCCCC..',
    '...CCCWWWWCCC...', '...CCCWWWWCCC...', '...CCC....CCC...', '...cc......cc...',
  ], 0);
  const cheeks = sprite(['.c............c.'], 6);
  const eyes = sprite(['....KK....KK....'.replace(/K/g, 'K'), '....KK....KK....'], 4);
  const happy = sprite(['.....K....K.....', '....K.K..K.K....'], 4);
  const tailA = sprite(['...............C', '...............C', '..............CC'], 7);
  const tailB = sprite(['.............CCC', '...............C'], 9);
  const css = [
    gate('mHappy', [[10, 60]]).css, gate('mCalm', inv([[10, 60]])).css, gate('mBub', [[12, 62]]).css, gate('mHeart', [[28, 72]]).css,
    '.tlA{animation:tlA .9s step-end infinite}.tlB{animation:tlB .9s step-end infinite}', kf('tlA', [[0, 50]]), kf('tlB', [[50, 100]]),
    `.rise{animation:rise ${C}s step-end infinite}@keyframes rise{0%{transform:translateY(0)}28%{transform:translateY(0)}40%{transform:translateY(-8px)}52%{transform:translateY(-16px)}64%{transform:translateY(-24px)}}`,
    ty.css,
  ].join('\n');
  const heart = sprite(['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], 0, 0, 5);
  const inner = sparkles(t, [[60, 40, 2.6, 0], [200, 84, 3.4, 1.1], [330, 30, 3, 2.2], [450, 90, 2.2, .6]]) +
    `<g transform="translate(${RX},26)">${head}${cheeks}` +
    `<g class="tlA">${tailA}</g><g class="tlB">${tailB}</g>` +
    `<g class="a mCalm"><g class="eyes">${eyes}</g></g><g class="alt a mHappy">${happy}</g></g>` +
    `<g class="alt a mHeart"><g class="rise"><g transform="translate(${RX + 118},64)">${heart}</g></g></g>` +
    `<g class="alt a mBub">${bubble(t, RX - 16, 34, bw, 50)}${bubbleText(t, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner);
}


// 5) OCTO: an original purple pixel octopus with cat ears; tentacles wiggle, one arm waves
function octo(theme) {
  const t = TH[theme], C = 10, text = 'Hi! PR merged!';
  const ty = typed('o', text, 10, 1.3, 88, C), bw = bubbleW(text.length);
  const css = [
    gate('oDown', inv([[8, 40]])).css, gate('oUp1', [[8, 12], [16, 20], [24, 28], [32, 36]]).css, gate('oUp2', [[12, 16], [20, 24], [28, 32], [36, 40]]).css,
    gate('oHappy', [[8, 88]]).css, gate('oCalm', inv([[8, 88]])).css, gate('oBub', [[8, 88]]).css,
    kf('oHop', [[8, 10]], 'transform', 'translateY(-8px)', 'translateY(0)') + '.oHop{animation-name:oHop}',
    '.tnA{animation:tnA .6s step-end infinite}.tnB{animation:tnB .6s step-end infinite}', kf('tnA', [[0, 50]]), kf('tnB', [[50, 100]]),
    ty.css,
  ].join('\n');
  const head = sprite([
    '..VV........VV..', '..VVV......VVV..', '..VVVVVVVVVVVV..', '.VVVVVVVVVVVVVV.', '.VVVVVVVVVVVVVV.',
    '.VVVVVVVVVVVVVV.', '.VVVVVVVVVVVVVV.', '.VVVVVVVVVVVVVV.', '..UUUUUUUUUUUU..',
  ], 0) + sprite(['...L........L...'], 3) + sprite(['..P..........P..'], 6) + sprite(['V..............V'], 5) + sprite(['V..............V'], 6);
  const tBase = '.UU..UU..UU..UU.', tR = '..UU..UU..UU..UU', tL = 'UU..UU..UU..UU..';
  const tA = sprite([tBase, tBase, tR], 9);
  const tB = sprite([tBase, tL, tBase], 9);
  const eyes = sprite(['....WK....WK....', '....KK....KK....'], 4);
  const happy = sprite(['.....K....K.....', '....K.K..K.K....'], 4) + sprite(['......K..K......', '.......KK.......'], 6);
  const up1 = sprite(Array(4).fill('...............V.'), 3);
  const up2 = sprite(['................V', '...............VV', '...............V.', '...............V.'], 3);
  const inner = sparkles(t, [[60, 40, 2.6, 0], [200, 84, 3.4, 1.1], [330, 30, 3, 2.2], [450, 90, 2.2, .6]]) +
    `<g transform="translate(${RX},26)"><g class="a oHop">` + head +
    `<g class="tnA">${tA}</g><g class="tnB">${tB}</g>` +
    `<g class="alt a oUp1">${up1}</g><g class="alt a oUp2">${up2}</g>` +
    `<g class="a oCalm"><g class="eyes">${eyes}</g></g><g class="alt a oHappy">${happy}</g>` +
    `</g></g>` +
    `<g class="alt a oBub">${bubble(t, RX - 16, 34, bw, 50)}${bubbleText(t, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner);
}

// grow every rect of a sprite by g px and paint it dark: a crisp outline behind the glowing face
const outline = (svg, g, col) => svg.replace(/x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="[^"]+"/g,
  (m, x, y, w, h) => `x="${x - g}" y="${y - g}" width="${+w + 2 * g}" height="${+h + 2 * g}" fill="${col}"`);

// 6) PUMPKIN: Halloween jack-o'-lantern with a flickering glow, flying bats, "Trick or treat!"
function pumpkin(theme) {
  const t = TH[theme], C = 10, text = 'Trick or treat!';
  const ty = typed('p', text, 10, 1.3, 72, C), bw = bubbleW(text.length);
  const boo = [[8, 70]];
  const css = [
    gate('pBoo', boo).css, gate('pCalm', inv(boo)).css, gate('pBub', boo).css,
    kf('pHop', [[8, 10]], 'transform', 'translateY(-8px)', 'translateY(0)') + '.pHop{animation-name:pHop}',
    kf('pShk', [[10, 11], [12, 13]], 'transform', 'translateX(4px)', 'translateX(-4px)') + '.pShk{animation-name:pShk}',
    '.gw rect{animation:fl .9s step-end infinite}@keyframes fl{0%{fill:#ffd23f}34%{fill:#ffb703}67%{fill:#ffe066}}',
    '.fA{animation:fA .4s step-end infinite}.fB{animation:fB .4s step-end infinite}', kf('fA', [[0, 50]]), kf('fB', [[50, 100]]),
    '.bat{animation:fly 9s steps(60,end) infinite}@keyframes fly{0%{transform:translateX(-30px)}100%{transform:translateX(1000px)}}',
    ty.css,
  ].join('\n');
  const body = sprite([
    '.......NN.......', '......NNNN.TT...', '...QQQQQQQQQQ...', '.QQQQqQQQQqQQQQ.',
    'QQQQQQQQQQQQQQQQ', 'QQQQQQQQQQQQQQQQ', 'QQQQQQQQQQQQQQQQ', 'QQQQQQQQQQQQQQQQ', 'QQQQQQQQQQQQQQQQ', 'QQQQQQQQQQQQQQQQ',
    '.QQQQqQQQQqQQQQ.', '...qqqqqqqqqq...',
  ], 0);
  const eyes = sprite(['....YY....YY....', '...YYYY..YYYY...'], 4);
  const nose = sprite(['.......YY.......'], 6);
  const smile = sprite(['...YY.YYYY.YY...', '....YYYYYYYY....'], 8);
  const open = sprite(['...YYYYYYYYYY...', '....YYYYYYYY....', '......YYYY......'], 8);
  const bat = (y, dur, dl) => `<g transform="translate(0,${y})"><g class="bat" style="animation-duration:${dur}s;animation-delay:-${dl}s">` +
    `<g class="fA">${sprite(['U.....U', 'UU.U.UU', '.UUUUU.', '..U.U..'], 0, 0, 5)}</g><g class="fB">${sprite(['..U.U..', '.UUUUU.', 'UU.U.UU', 'U.....U'], 0, 0, 5)}</g></g></g>`;
  const inner = sparkles(t, [[60, 90, 2.6, 0], [330, 84, 3, 2.2], [450, 96, 2.2, .6]]) +
    bat(22, 9, 0) + bat(56, 11, 4) + bat(36, 8, 6) +
    `<g transform="translate(${RX},26)"><g class="a pHop"><g class="a pShk">` + body +
    `<g>${outline(eyes + nose, 1, '#5a2a05')}<g class="a pCalm">${outline(smile, 1, '#5a2a05')}</g><g class="alt a pBoo">${outline(open, 1, '#5a2a05')}</g></g>` +
    `<g class="gw"><g class="eyes">${eyes}</g>${nose}<g class="a pCalm">${smile}</g><g class="alt a pBoo">${open}</g></g>` +
    `</g></g></g>` +
    `<g class="alt a pBub">${bubble(t, RX - 16, 34, bw, 50)}${bubbleText(t, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return render(theme, C, css, inner, { bg: { dark: '#22142f', light: '#e8dcf3' } });
}

const DESIGNS = { sleepy, coder, walker, cat, octo, pumpkin, pumpkin };
module.exports = { useTheme, tokens, contrast, DESIGNS, sleepy, coder, walker, cat, octo, pumpkin, ROBOT, RX, render, sparkles, TH, H, W, PX, MONO, esc, sprite, kf, inv, gate, typed, bubble, bubbleW, bubbleText, setPal };

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'mascots');
  fs.mkdirSync(out, { recursive: true });
  for (const [name, fn] of Object.entries(DESIGNS)) {
    for (const theme of ['dark', 'light']) fs.writeFileSync(path.join(out, `${name}.${theme}.svg`), fn(theme));
  }
  console.log('wrote', Object.keys(DESIGNS).join(', '), '->', out);
}
