'use strict';
// Cyberpunk pixel mascots: neon palette, skyline, perspective grid floor, scanlines, glitch.
// Usage: node scripts/cyber.js [outDir]
const fs = require('fs');
const path = require('path');
const M = require('./mascots');
const { W, H, PX, MONO, sprite, kf, inv, gate, typed, bubble, bubbleW, bubbleText, setPal } = M;

const CY = {
  dark: {
    pal: { n: '#00f0ff', m: '#ff2bd6', v: '#7a5cff', y: '#fcee09', a: '#2a2f4d', b: '#4a5280', e: '#080a16', g: '#39ff88', r: '#ff3b5c' },
    bg1: '#080a16', bg2: '#1c0f38', sky: '#121734', grid: '#ff2bd6', line: '#00f0ff', panel: '#080a16', border: '#00f0ff',
    text: '#00f0ff', green: '#39ff88', scan: 0.28, rain: '#00f0ff',
  },
  light: {
    pal: { n: '#0891b2', m: '#c026a3', v: '#6d4aff', y: '#ca8a04', a: '#3b4160', b: '#6a7299', e: '#12142a', g: '#16a34a', r: '#dc2626' },
    bg1: '#e9ebf7', bg2: '#f1e2f6', sky: '#c3c8e4', grid: '#c026a3', line: '#0891b2', panel: '#f7f8fd', border: '#0891b2',
    text: '#0e7490', green: '#15803d', scan: 0.07, rain: '#0891b2',
  },
};
const RX = W - 28 - 17 * PX;

const SKY = [[30, 36, 38], [74, 24, 56], [104, 40, 30], [150, 28, 48], [184, 44, 36], [236, 26, 62], [268, 38, 28], [312, 32, 50],
  [350, 46, 34], [402, 24, 58], [432, 40, 40], [478, 30, 26], [514, 36, 46], [556, 28, 32], [590, 40, 54]];

function skyline(c) {
  let o = '', n = 0;
  const cols = [c.line, c.grid, '#fcee09'];
  SKY.forEach(([x, w, h]) => {
    o += `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" fill="${c.sky}"/>`;
    for (let wy = 100 - h + 6; wy < 94; wy += 10) {
      for (let wx = x + 4; wx < x + w - 6; wx += 8) {
        const k = (wx * 7 + wy * 13) % 5;
        if (k < 2) {
          n++;
          o += `<rect class="tw" style="animation-duration:${2 + (n % 4)}s;animation-delay:-${n % 5}s" x="${wx}" y="${wy}" width="4" height="4" fill="${cols[(wx + wy) % 3]}"/>`;
        }
      }
    }
  });
  return o;
}

function floor(c) {
  let o = `<g stroke="${c.grid}" stroke-width="1" opacity=".45" fill="none">`;
  [100, 104, 110, 119, 132].forEach(y => { o += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`; });
  for (let k = -12; k <= 12; k++) o += `<line x1="480" y1="100" x2="${480 + k * 110}" y2="140"/>`;
  o += `</g><rect x="0" y="99" width="${W}" height="2" fill="${c.line}" opacity=".7" filter="url(#gl)"/>`;
  o += `<rect class="pulse" x="0" y="100" width="${W}" height="2" fill="${c.grid}" opacity=".9"/>`;
  return o;
}

function rain(c, x0, x1) {
  let o = '', seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let x = x0, i = 0; x < x1; x += 34, i++) {
    let spans = '';
    for (let j = 0; j < 9; j++) spans += `<tspan x="${x}" dy="12">${rnd() < 0.5 ? '0' : '1'}</tspan>`;
    o += `<text class="rn" style="animation-duration:${3 + (i % 4)}s;animation-delay:-${(i * 7) % 5}s" y="-100" font-size="11" font-family="${MONO}" fill="${c.rain}" opacity=".5">${spans}</text>`;
  }
  return o;
}

function renderCyber(theme, cycle, css, inner, opt = {}) {
  const c = CY[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg1}"/><stop offset="1" stop-color="${c.bg2}"/></linearGradient>
<pattern id="sl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="${c.scan}"/></pattern>
<filter id="gl" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="cp"><rect width="${W}" height="${H}" rx="6"/></clipPath>
</defs>
<style>
.a{animation-duration:${cycle}s;animation-iteration-count:infinite;animation-timing-function:step-end}
.eyes{transform-box:fill-box;transform-origin:center;animation:blink 4.7s step-end infinite}
.tw{animation:tw 3s step-end infinite}
.led{animation:led 1.2s step-end infinite}
.pulse{animation:pulse 1.8s step-end infinite}
.rn{animation-name:rain;animation-timing-function:steps(22,end);animation-iteration-count:infinite}
@keyframes blink{0%{transform:scaleY(1)}90%{transform:scaleY(1)}92%{transform:scaleY(.15)}97%{transform:scaleY(1)}}
@keyframes tw{0%{opacity:.15}50%{opacity:.95}}
@keyframes led{0%{opacity:1}50%{opacity:.15}}
@keyframes pulse{0%{transform:translateY(0)}20%{transform:translateY(4px)}40%{transform:translateY(10px)}60%{transform:translateY(19px)}80%{transform:translateY(32px)}}
@keyframes rain{0%{transform:translateY(0)}100%{transform:translateY(250px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.tc{fill-opacity:1!important}.alt{display:none!important}}
${css}
</style>
<g clip-path="url(#cp)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${opt.rain ? rain(c, 40, 560) : ''}
${skyline(c)}
${floor(c)}
${inner}
<rect width="${W}" height="${H}" fill="url(#sl)"/>
</g>
</svg>`;
}

const cbub = (c, r, by, bw, bh) => bubble({ panel: c.panel, dim: c.border }, r, by, bw, bh);

// glitch bars: thin colored strips flashing across the mascot
function glitchBars(c, x, y0, ivs) {
  const bars = [[8, 6, c.line, 0], [38, 4, c.grid, 1], [64, 5, c.line, 2]];
  return bars.map(([dy, h, col, i]) =>
    `<rect class="alt a gb${i}" x="${x - 8 + (i % 2) * 6}" y="${y0 + dy}" width="${150 - i * 12}" height="${h}" fill="${col}" opacity=".75"/>`).join('');
}
const gbCss = ivs => [0, 1, 2].map(i => kf(`gb${i}`, ivs.map(([a, b]) => [a + i * 0.4, b + i * 0.4])) + `.gb${i}{animation-name:gb${i}}`).join('\n');
const glCss = (name, ivs) => {
  const sh = [-8, 6, -4, 5];
  let s = `@keyframes ${name}{0%{transform:translate(0,0)}`;
  ivs.forEach(([a, b]) => { s += `${a}%{transform:translate(${sh[0]}px,0)}${a + 0.5}%{transform:translate(${sh[1]}px,0)}${a + 1}%{transform:translate(${sh[2]}px,0)}${b}%{transform:translate(0,0)}`; });
  return s + `}.${name}{animation-name:${name}}`;
};

// 1) NEON: cyber robot with a visor, antenna lights and a glitchy "SYSTEM ONLINE" boot
function neon(theme) {
  const c = CY[theme]; setPal(c.pal);
  const C = 12, text = '> SYSTEM ONLINE_';
  const ty = typed('n', text, 12, 1.5, 74, C), bw = bubbleW(text.length);
  const up1T = [[8, 12], [16, 20], [24, 28], [32, 36]], up2T = [[12, 16], [20, 24], [28, 32], [36, 40]];
  const glit = [[8, 9], [44, 45]];
  const css = [
    gate('nDown', inv([[8, 40]])).css, gate('nUp1', up1T).css, gate('nUp2', up2T).css,
    gate('nHappy', [[8, 70]]).css, gate('nCalm', inv([[8, 70]])).css, gate('nBub', [[8, 74]]).css,
    kf('nHop', [[8, 10]], 'transform', 'translateY(-8px)', 'translateY(0)') + '.nHop{animation-name:nHop}',
    glCss('nGl', glit), gbCss(glit),
    '.tA{animation:tA 1.2s step-end infinite}.tB{animation:tB 1.2s step-end infinite}', kf('tA', [[0, 50]]), kf('tB', [[50, 100]]),
    ty.css,
  ].join('\n');
  const arm = sprite(['..............bb.', '..............bb.'], 5);
  const leds = [5, 6, 7, 8, 9, 10].map((col, i) =>
    `<rect class="led" style="animation-delay:-${(i * 0.2).toFixed(1)}s" x="${col * PX}" y="${7 * PX + 2}" width="${PX}" height="4" fill="${i % 2 ? c.pal.m : c.pal.n}"/>`).join('');
  const body = sprite([
    '...bbbbbbbbbb....', '..aaaaaaaaaaaa...', '..aeeeeeeeeeea...', 'bbaeeeeeeeeeea...', 'bbaaaaaaaaaaaa...',
    '..aaaaaaaaaaaa...', '..aaaaaaaaaaaa...', '...eeeeeeeeee....',
  ], 2);
  const ant = sprite(['....b......b....'], 1) + `<g class="tA">${sprite(['....m'], 0)}</g><g class="tB">${sprite(['...........n'], 0)}</g>`;
  const legs = sprite(['....bb....bb....', '...bbbb..bbbb...'], 10);
  const eyes = sprite(['....nn....nn....', '....nn....nn....'], 4);
  const happy = sprite(['.....n....n.....', '....n.n..n.n....'], 4);
  const up1 = sprite(['..............nn.', '..............bb.', '..............bb.', '..............bb.'], 3);
  const up2 = sprite(['...............nn', '...............bb', '..............bb.', '..............bb.'], 3);
  const inner = `<g transform="translate(${RX},26)"><g class="a nGl"><g class="a nHop">` +
    ant + body + legs + leds +
    `<g class="a nDown">${arm}</g><g class="alt a nUp1">${up1}</g><g class="alt a nUp2">${up2}</g>` +
    `<g class="a nCalm" filter="url(#gl)"><g class="eyes">${eyes}</g></g><g class="alt a nHappy" filter="url(#gl)">${happy}</g>` +
    `</g></g></g>` + glitchBars(c, RX, 26, glit) +
    `<g class="alt a nBub">${cbub(c, RX - 16, 34, bw, 50)}${bubbleText({ text: c.text }, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return renderCyber(theme, C, css + '\n' + gbCss(glit).replace(/(^|\n)/g, '$1'), inner);
}

// 2) HACKER: hooded figure behind a laptop, matrix rain, ACCESS GRANTED
function hacker(theme) {
  const c = CY[theme]; setPal(c.pal);
  const C = 12, text = 'ACCESS GRANTED', ok = [[60, 88]];
  const ty = typed('h', text, 62, 1.6, 90, C), bw = bubbleW(text.length);
  const glit = [[60, 61]];
  const css = [
    gate('hCalm', inv(ok)).css, gate('hOk', ok).css, gate('hBub', [[62, 90]]).css,
    glCss('hGl', glit), gbCss(glit),
    '.kA{animation:kA .5s step-end infinite}.kB{animation:kB .5s step-end infinite}', kf('kA', [[0, 50]]), kf('kB', [[50, 100]]),
    ty.css,
  ].join('\n');
  const figure = sprite([
    '.....aaaaaa.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '...aaeeeeeeaa...', '..aaaeeeeeeaaa..', '..aaaeeeeeeaaa..',
    '..aaaeeeeeeaaa..', '..aaaaeeeeaaaa..', '.aaaaaaaaaaaaaa.', '.aaabbbbbbbbaaa.', '.aaabaaaaaabaaa.', '.aaabaaaaaabaaa.', '..bbbbbbbbbbbb..',
  ], 0);
  const calm = sprite(['.....nn..nn.....'], 4) + sprite(['.......nn.......', '.......nn.......'], 10);
  const good = sprite(['.....gg..gg.....'], 4) + sprite(['.....g....g.....'], 6) + sprite(['......gggg......'], 7) + sprite(['.......gg.......', '.......gg.......'], 10);
  const keysA = sprite(['....n...n..n....'], 12), keysB = sprite(['.....n..n..n...'], 12);
  const inner = `<g transform="translate(${RX},18)"><g class="a hGl">${figure}` +
    `<g class="a hCalm" filter="url(#gl)"><g class="eyes">${calm}</g></g><g class="alt a hOk" filter="url(#gl)">${good}</g>` +
    `<g class="kA">${keysA}</g><g class="kB">${keysB}</g></g></g>` + glitchBars(c, RX, 18, glit) +
    `<g class="alt a hBub">${cbub(c, RX - 16, 34, bw, 50)}${bubbleText({ text: c.green }, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return renderCyber(theme, C, css, inner, { rain: true });
}

// 3) DRONE: hovering scanner drone sweeps a beam, finds "0 BUGS"
function drone(theme) {
  const c = CY[theme]; setPal(c.pal);
  const C = 12, text = 'SCAN OK: 0 BUGS', found = [[52, 90]];
  const ty = typed('d', text, 54, 1.8, 90, C), bw = bubbleW(text.length);
  const css = [
    gate('dScan', inv([[52, 100]])).css, gate('dOk', found).css, gate('dBub', [[54, 90]]).css, gate('dRest', [[90, 100]]).css,
    '.bob{animation:bob 1.2s step-end infinite}@keyframes bob{0%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '.pr1{animation:pr1 .3s step-end infinite}.pr2{animation:pr2 .3s step-end infinite}', kf('pr1', [[0, 50]]), kf('pr2', [[50, 100]]),
    '.iris{animation:iris 12s step-end infinite}@keyframes iris{0%{transform:translateX(-16px)}8%{transform:translateX(-8px)}16%{transform:translateX(0)}24%{transform:translateX(8px)}32%{transform:translateX(16px)}40%{transform:translateX(8px)}46%{transform:translateX(0)}52%{transform:translateX(0)}}',
    '.beam{transform-box:fill-box;transform-origin:100% 50%;animation:beam 12s step-end infinite}@keyframes beam{0%{transform:rotate(-50deg)}8%{transform:rotate(-42deg)}16%{transform:rotate(-34deg)}24%{transform:rotate(-26deg)}32%{transform:rotate(-18deg)}40%{transform:rotate(-26deg)}46%{transform:rotate(-34deg)}52%{transform:rotate(-30deg)}}',
    ty.css,
  ].join('\n');
  const body = sprite([
    '...bbbbbbbbbb...', '..baaaaaaaaaab..', '..baeeeeeeeeab..', '..baeeeeeeeeab..', '..baeeeeeeeeab..', '..baaaaaaaaaab..', '...bbbbbbbbbb...',
  ], 2) + sprite(['.b............b.', '.a............a.', '.a............a.'], 1)
    + sprite(['....b......b....', '....b......b....'], 9);
  const propsA = sprite(['bbbb........bbbb'], 0), propsB = sprite(['.bb..........bb.'], 0);
  const irisC = col => sprite(['.......' + col + col + '.......'.slice(0, 7), '.......' + col + col + '.......'.slice(0, 7), '.......' + col + col + '.......'.slice(0, 7)], 4);
  const ax = RX + 64, ay = 22 + 66 - 22; // eye centre
  const beam = col => `<polygon points="0,0 -380,-50 -380,50" fill="${col}" opacity=".22"/>`;
  const inner = `<ellipse cx="${RX + 64}" cy="121" rx="42" ry="3" fill="#000" opacity=".35"/>` +
    `<g transform="translate(${ax},66)"><g class="a dScan"><g class="beam">${beam(c.pal.r)}</g></g>` +
    `<g class="alt a dOk">${beam(c.pal.g).replace('opacity=".22"', 'opacity=".2"')}</g></g>`.replace('<g class="alt a dOk">', '<g class="alt a dOk" transform="rotate(-24)">') +
    `<g transform="translate(${RX},22)"><g class="bob">` +
    body + `<g class="pr1">${propsA}</g><g class="pr2">${propsB}</g>` +
    `<g class="a dScan" filter="url(#gl)"><g class="iris">${irisC('r')}</g></g>` +
    `<g class="alt a dOk" filter="url(#gl)">${irisC('g')}</g>` +
    `<g class="eyes" style="display:none"></g>` +
    `</g></g>` +
    `<g class="alt a dBub">${cbub(c, RX - 16, 34, bw, 50)}${bubbleText({ text: c.green }, RX - 16 - bw + 22, 60, ty.spans)}</g>`;
  return renderCyber(theme, C, css, inner);
}

const DESIGNS = { neon, hacker, drone };
module.exports = { DESIGNS };
if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'mascots');
  fs.mkdirSync(out, { recursive: true });
  for (const [name, fn] of Object.entries(DESIGNS)) for (const theme of ['dark', 'light']) fs.writeFileSync(path.join(out, `${name}.${theme}.svg`), fn(theme));
  console.log('wrote', Object.keys(DESIGNS).join(', '), '->', out);
}
