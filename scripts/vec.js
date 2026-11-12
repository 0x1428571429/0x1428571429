'use strict';
// Vector (SVG path) Breath-of-the-Wild style characters for the header: smooth shapes, gradient shading,
// coloured outlines and a soft ground shadow. Same pose interface as characters.js (body / eyes / happy / arm frames).
const { BIOME, backdrop, front, mix } = require('./backdrop');
const CX = 98, G = 96;                       // figure centre x and ground y inside the character group (translate(796,26))
const INK = '#160d24';
const dk = c => mix(c, INK, 0.55);          // outline colour derived from the fill
const n1 = v => Math.round(v * 10) / 10;

// per-character gradient registry (ids must be unique inside the header SVG)
class Ctx {
  constructor(id) { this.id = id; this.defs = ''; this.n = 0; this.cache = {}; }
  g(c) { // vertical light-top / dark-bottom gradient in figure space
    return this.cache['g' + c] || (this.cache['g' + c] = this.add(`<linearGradient id="%ID%" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="${G}"><stop offset="0" stop-color="${mix(c, '#fff6dc', 0.3)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#241a3d', 0.42)}"/></linearGradient>`));
  }
  r(c) { // radial gradient for round volumes, light from the upper left
    return this.cache['r' + c] || (this.cache['r' + c] = this.add(`<radialGradient id="%ID%" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${mix(c, '#fff6dc', 0.32)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#241a3d', 0.42)}"/></radialGradient>`));
  }
  add(def) { const id = `v${this.id}${this.n++}`; this.defs += def.replace('%ID%', id); return `url(#${id})`; }
}
const O = (c, w = 1) => ` stroke="${dk(c)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const path = (X, d, c, o = {}) => `<path d="${d}" fill="${o.flat ? c : o.round ? X.r(c) : X.g(c)}"${o.noline ? '' : O(c, o.w)}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const ell = (X, cx, cy, rx, ry, c, o = {}) => `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${rx}" ry="${ry}" fill="${o.flat ? c : X.r(c)}"${o.noline ? '' : O(c, o.w)}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const limb = (X, x1, y1, x2, y2, w, c, flat) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${dk(c)}" stroke-width="${w + 2}" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="${flat ? c : X.g(c)}" stroke-width="${w}" stroke-linecap="round"/>`;
const stroke = (d, c, w, o = {}) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
const hi = (cx, cy, rx, ry, op = 0.35, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff8e8" opacity="${op}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const poly = pts => 'M' + pts.map(p => p.join(' ')).join('L') + 'Z';

// ---------------------------------------------------------------- shared humanoid parts (figure ~84px tall, 3.5 heads)
const HEAD = { cx: CX, cy: 26, rx: 11, ry: 12 };
const shadow = (rx = 24) => `<ellipse cx="${CX}" cy="${G}" rx="${rx}" ry="4" fill="${INK}" opacity=".3"/><ellipse cx="${CX}" cy="${G}" rx="${rx * 0.6}" ry="2.4" fill="${INK}" opacity=".25"/>`;
const head = (X, skin, o = {}) => ell(X, o.cx || HEAD.cx, o.cy || HEAD.cy, o.rx || HEAD.rx, o.ry || HEAD.ry, skin) + hi((o.cx || CX) - 4, (o.cy || 26) - 6, 3.5, 2, 0.28, -25);
const neck = (X, skin) => limb(X, CX, 35, CX, 43, 6, skin);
const torso = (X, c, o = {}) => path(X, `M${CX - 15} 47Q${CX - 12} 42 ${CX - 6} 42L${CX + 6} 42Q${CX + 12} 42 ${CX + 15} 47L${CX + 12} ${o.bottom || 64}L${CX - 12} ${o.bottom || 64}Z`, c);
const humanEars = (X, skin) => ell(X, CX - 11, 28, 2.4, 3, skin) + ell(X, CX + 11, 28, 2.4, 3, skin);
const pointyEars = (X, skin) => path(X, poly([[CX - 9, 24], [CX - 19, 21], [CX - 10, 31]]), skin) + path(X, poly([[CX + 9, 24], [CX + 19, 21], [CX + 10, 31]]), skin) +
  `<path d="M${CX - 11} 25L${CX - 16} 22.5L${CX - 11} 29Z M${CX + 11} 25L${CX + 16} 22.5L${CX + 11} 29Z" fill="${mix(skin, '#c04060', 0.3)}" opacity=".6"/>`;
// hair cap over the head: top arc, then the fringe polyline (left -> right) as the lower edge
function cap(X, c, fringe, o = {}) {
  const top = o.top || 11, x0 = fringe[0][0], x1 = fringe[fringe.length - 1][0];
  const d = `M${x0} ${fringe[0][1]}Q${x0 - 2} ${top + 2} ${CX} ${top}Q${x1 + 2} ${top + 2} ${x1} ${fringe[fringe.length - 1][1]}` + fringe.slice().reverse().map(p => `L${p[0]} ${p[1]}`).join('') + 'Z';
  return path(X, d, c) + hi(CX - 4, top + 4, 5, 1.6, 0.35, -10);
}
const legs = (X, c, o = {}) => limb(X, CX - 6, o.top || 66, CX - 6.5, o.bottom || 86, o.w || 7.5, c) + limb(X, CX + 6, o.top || 66, CX + 6.5, o.bottom || 86, o.w || 7.5, c);
function boots(X, c, o = {}) {
  const top = o.top || 84, cuff = o.cuff;
  const one = (x, dir) => path(X, `M${x - 5} ${top}L${x + 5} ${top}L${x + 5} ${G - 4}L${x + 5 + dir * 3} ${G - 1}Q${x + 5 + dir * 3} ${G} ${x + 4 + dir * 2} ${G}L${x - 5} ${G}Z`, c) +
    (cuff ? path(X, `M${x - 5.5} ${top}L${x + 5.5} ${top}L${x + 5.5} ${top + 3}L${x - 5.5} ${top + 3}Z`, cuff) : '');
  return one(CX - 6.5, -1) + one(CX + 6.5, 1);
}
const farArm = (X, c, skin, o = {}) => limb(X, CX - 13, 46, CX - 17, o.len || 66, 6.5, c) + limb(X, CX - 17, o.len || 66, CX - 17.5, (o.len || 66) + 3, 6, skin) + ell(X, CX - 17.5, (o.len || 66) + 5, 3.2, 3.2, skin);
// near arm (viewer's right), shoulder S; the whole arm rotates about the shoulder for the wave frames
function arm(X, pose, o) {
  const sx = o.sx || CX + 13, sy = o.sy || 46, len = o.len || 20, w = o.w || 6.5, hand = o.hand || 3.2;
  const ex = sx + 3, ey = sy + len;
  let a = limb(X, sx, sy, ex, ey, w, o.c) + (o.cuff ? limb(X, ex - 0.2, ey - 1, ex + 0.1, ey + 1.5, w + 0.6, o.cuff, true) : '') +
    limb(X, ex, ey, ex + 0.5, ey + 3, w - 1, o.skin) + ell(X, ex + 0.7, ey + 5, hand, hand, o.skin) + (o.extra || '');
  if (pose === 'down') return a;
  return `<g transform="rotate(${pose === 'up1' ? -140 : -162} ${sx} ${sy})">${a}</g>`;
}
function eyes(o = {}) {
  const y = o.y || 27, dx = o.dx || 5.5, rx = o.rx || 2.4, ry = o.ry || 2.8, iris = o.iris || '#3d7fd8';
  let s = '';
  for (const x of [CX - dx, CX + dx]) {
    s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ffffff" stroke="${INK}" stroke-width=".6"/>` +
      `<circle cx="${x}" cy="${y + 0.3}" r="${ry * 0.62}" fill="${iris}"/><circle cx="${x}" cy="${y + 0.5}" r="${ry * 0.33}" fill="${INK}"/><circle cx="${x - 0.7}" cy="${y - 0.9}" r="${ry * 0.25}" fill="#ffffff"/>`;
  }
  return s + (o.brows === false ? '' : brows(o));
}
const brows = (o = {}) => { const y = (o.y || 27) - 5, dx = o.dx || 5.5, c = o.browC || INK, t = o.tilt || 0; return stroke(`M${CX - dx - 2.5} ${y + 0.5 - t}Q${CX - dx} ${y - 0.8} ${CX - dx + 2.5} ${y + 0.5 + t}M${CX + dx - 2.5} ${y + 0.5 + t}Q${CX + dx} ${y - 0.8} ${CX + dx + 2.5} ${y + 0.5 - t}`, c, o.browW || 1.1); };
const happy = (o = {}) => { const y = o.y || 27, dx = o.dx || 5.5; return stroke(`M${CX - dx - 2.4} ${y + 0.6}Q${CX - dx} ${y - 2.6} ${CX - dx + 2.4} ${y + 0.6}M${CX + dx - 2.4} ${y + 0.6}Q${CX + dx} ${y - 2.6} ${CX + dx + 2.4} ${y + 0.6}`, INK, 1.3) + brows(o); };
const mouth = (skin, y = 33, open) => open ? `<path d="M${CX - 2.5} ${y}Q${CX} ${y + 3.6} ${CX + 2.5} ${y}Z" fill="${mix(skin, '#5a1a1a', 0.6)}"/>` : stroke(`M${CX - 2.2} ${y}Q${CX} ${y + 1.8} ${CX + 2.2} ${y}`, mix(skin, '#5a1a1a', 0.5), 1);
const blush = (skin, y = 31) => `<ellipse cx="${CX - 7}" cy="${y}" rx="2.2" ry="1.1" fill="${mix(skin, '#ff4d6d', 0.5)}" opacity=".4"/><ellipse cx="${CX + 7}" cy="${y}" rx="2.2" ry="1.1" fill="${mix(skin, '#ff4d6d', 0.5)}" opacity=".4"/>`;

// ---------------------------------------------------------------- characters
function make(c) {
  const X = new Ctx(c.id);
  const body = c.draw(X), eye = c.eyes(X), hap = c.happy(X);
  const frames = { down: arm(X, 'down', c.arm), up1: arm(X, 'up1', c.arm), up2: arm(X, 'up2', c.arm) };
  return {
    raw: { defs: X.defs, body, eyes: eye, happy: hap, down: frames.down, up1: frames.up1, up2: frames.up2 },
    shadowRx: c.shadow || 24,
    hd: true, name: c.name, pal: {}, bg: c.bg, tile: c.tile, antenna: '', holdDy: 0, hatRow: 0, hatCol: 0, bubbleR: 852, bubbleY: 4,
    body: () => `<defs>${X.defs}</defs>` + shadow(c.shadow) + body,
    legs: '',
    eyes: eye, happy: hap, armDown: frames.down, up1: frames.up1, up2: frames.up2,
    backdrop: theme => backdrop(c.biome, theme),
    front: theme => front(c.biome, theme),
  };
}

const CH = {};
// ---- Link: blue Champion's tunic, Master Sword on the back
{
  const skin = '#f3cfae', hair = '#e9c04f', blue = '#3a7fd8', cream = '#f1ede6', brown = '#6b4426', gold = '#dcae3c', tan = '#cdb28a', boot = '#6e4a2c';
  CH.link = make({ id: 'L', name: '林克（荒野之息）', biome: 'meadow', bg: { dark: '#10261a', light: '#e2f0d9' }, tile: ['#5fae3a', '#7a5230', '#5a3b22'],
    arm: { c: blue, skin, cuff: cream },
    draw: X => limb(X, CX - 13, 42, CX - 20, 29, 3.2, '#4b4fb3') + path(X, poly([[CX - 24, 29], [CX - 17, 27], [CX - 21, 31.5]]), gold) + path(X, poly([[CX - 16, 27], [CX - 22, 24.5], [CX - 18, 30]]), gold) + ell(X, CX - 21, 27.5, 1.6, 1.6, '#d7dde8') +
      path(X, poly([[CX + 10, 62], [CX + 19, 84], [CX + 15, 85]]), '#4b4fb3') + // scabbard tip behind the hip
      ell(X, CX, 24, 12.5, 13, hair) + path(X, poly([[CX - 12, 22], [CX - 14, 38], [CX - 7, 33]]), hair) + path(X, poly([[CX + 12, 22], [CX + 14, 38], [CX + 7, 33]]), hair) +
      farArm(X, blue, skin) + limb(X, CX - 17, 64, CX - 17.3, 67, 7.2, cream, true) +
      legs(X, tan, { top: 64 }) + boots(X, boot, { cuff: '#9c6a3c' }) +
      neck(X, skin) + torso(X, blue) + path(X, `M${CX - 12} 62L${CX + 12} 62L${CX + 14} 72L${CX - 14} 72Z`, blue) + stroke(`M${CX - 12} 70.5L${CX + 12} 70.5`, '#9ec4f5', 0.8, { op: 0.6 }) +
      path(X, poly([[CX - 5.5, 42], [CX, 49], [CX + 5.5, 42], [CX + 5, 40.5], [CX - 5, 40.5]]), cream) +
      stroke(`M${CX - 8} 43L${CX + 10} 61`, dk(brown), 4.2) + stroke(`M${CX - 8} 43L${CX + 10} 61`, brown, 2.6) +
      path(X, `M${CX - 12} 60L${CX + 12} 60L${CX + 12} 64L${CX - 12} 64Z`, brown) + path(X, `M${CX - 2} 59.5L${CX + 2} 59.5L${CX + 2} 64.5L${CX - 2} 64.5Z`, gold) +
      path(X, `M${CX - 17} 62Q${CX - 17} 60 ${CX - 15} 60L${CX - 10} 60Q${CX - 8} 60 ${CX - 8} 62L${CX - 8} 68Q${CX - 8} 70 ${CX - 10} 70L${CX - 15} 70Q${CX - 17} 70 ${CX - 17} 68Z`, '#3b3c4e') + `<circle cx="${CX - 12.5}" cy="65" r="1.4" fill="#5fd8ff"/>` +
      head(X, skin) + pointyEars(X, skin) +
      cap(X, hair, [[CX - 11, 29], [CX - 8, 22], [CX - 5, 27], [CX - 2, 20], [CX + 1, 26], [CX + 4, 20.5], [CX + 7, 26.5], [CX + 10, 22], [CX + 11, 29]]) +
      mouth(skin) + blush(skin),
    eyes: () => eyes({ iris: '#3d7fd8', browC: mix(hair, INK, 0.5) }), happy: () => happy({ browC: mix(hair, INK, 0.5) }) });
}
// ---- Mipha: Zora princess, red with a pale front, silver jewellery
{
  const red = '#e0505f', pale = '#f4ebee', silver = '#dfe6f2', sash = '#3d86d8';
  CH.mipha = make({ id: 'M', name: '米法（荒野之息）', biome: 'zora', bg: { dark: '#0d2433', light: '#dcedf5' }, tile: ['#4fb3d9', '#2a6f94', '#3a8ab5'], shadow: 22,
    arm: { c: red, skin: red, cuff: silver, hand: 2.8, w: 5.5 },
    draw: X => path(X, `M${CX - 4} 14Q${CX - 28} 6 ${CX - 21} 42Q${CX - 15} 24 ${CX - 2} 19Z`, mix(red, INK, 0.12)) + // head tail fin
      path(X, poly([[CX - 10, 25], [CX - 19, 22], [CX - 17, 32], [CX - 10, 30]]), red) + path(X, poly([[CX + 10, 25], [CX + 19, 22], [CX + 17, 32], [CX + 10, 30]]), red) +
      `<path d="${poly([[CX - 12, 26], [CX - 17, 24], [CX - 16, 30]])} ${poly([[CX + 12, 26], [CX + 17, 24], [CX + 16, 30]])}" fill="${pale}" opacity=".55"/>` +
      farArm(X, red, red, { len: 65 }) + limb(X, CX - 17, 64, CX - 17.3, 66, 6.4, silver, true) +
      legs(X, red, { top: 64, w: 6.5 }) + path(X, poly([[CX - 10, 80], [CX - 16, 88], [CX - 10, 88]]), red) + path(X, poly([[CX + 10, 80], [CX + 16, 88], [CX + 10, 88]]), red) +
      path(X, `M${CX - 11} 88L${CX - 2} 88L${CX - 1} ${G}L${CX - 15} ${G}Z`, pale) + path(X, `M${CX + 11} 88L${CX + 2} 88L${CX + 1} ${G}L${CX + 15} ${G}Z`, pale) +
      neck(X, pale) + torso(X, red) + path(X, `M${CX - 5} 42L${CX + 5} 42L${CX + 4} 64L${CX - 4} 64Z`, pale, { noline: true }) +
      stroke(`M${CX - 9} 45Q${CX} 54 ${CX + 9} 45`, dk(silver), 3.2) + stroke(`M${CX - 9} 45Q${CX} 54 ${CX + 9} 45`, silver, 2) + `<circle cx="${CX}" cy="51.5" r="2" fill="#3fa0ff" stroke="${INK}" stroke-width=".6"/>` +
      path(X, `M${CX - 12} 59L${CX + 12} 59L${CX + 13} 66L${CX - 13} 66Z`, sash) + stroke(`M${CX - 12} 60.5L${CX + 12} 60.5`, silver, 1.4) +
      head(X, red, { ry: 12.5, cy: 25.5 }) + ell(X, CX, 28, 7.6, 8.6, pale, { noline: true }) +
      stroke(`M${CX - 7} 18Q${CX} 15 ${CX + 7} 18`, silver, 1.6) + `<path d="M${CX} 15.5L${CX + 1.8} 18L${CX} 20.5L${CX - 1.8} 18Z" fill="#3fa0ff" stroke="${INK}" stroke-width=".6"/>` +
      mouth(pale, 34) + blush(pale, 32),
    eyes: () => eyes({ iris: '#e2b23c', rx: 2.7, ry: 3.1, y: 28, browC: mix(red, INK, 0.45) }), happy: () => happy({ y: 28, browC: mix(red, INK, 0.45) }) });
}
// ---- Revali: Rito archer, navy plumage, white face, Great Eagle Bow
{
  const navy = '#2f4f8f', light = '#5f86cf', white = '#f4f6fb', beak = '#e6b43c', scarf = '#3fb3a8', wood = '#8a5a30';
  CH.revali = make({ id: 'R', name: '力巴尔（荒野之息）', biome: 'snow', bg: { dark: '#14203a', light: '#e2e8f6' }, tile: ['#dbe6f5', '#6a7f9e', '#55667f'], shadow: 22,
    arm: { c: navy, skin: light, w: 7, hand: 3.4, extra: `<path d="M${CX + 16} 70Q${CX + 24} 73 ${CX + 18} 77Q${CX + 20} 72 ${CX + 14} 71Z" fill="${navy}" stroke="${dk(navy)}" stroke-width="1"/>` },
    draw: X => stroke(`M${CX + 14} 26Q${CX + 30} 50 ${CX + 14} 76`, dk(wood), 4.2) + stroke(`M${CX + 14} 26Q${CX + 30} 50 ${CX + 14} 76`, wood, 2.6) + stroke(`M${CX + 14} 26L${CX + 14} 76`, '#e8e2d0', 0.8) +
      path(X, poly([[CX - 6, 14], [CX - 16, 4], [CX - 10, 14]]), navy) + path(X, poly([[CX - 1, 13], [CX - 7, 1], [CX + 4, 13]]), navy) + path(X, poly([[CX + 4, 14], [CX + 11, 5], [CX + 9, 15]]), navy) +
      farArm(X, navy, light) + path(X, `M${CX - 20} 70Q${CX - 28} 73 ${CX - 22} 77Q${CX - 24} 72 ${CX - 18} 71Z`, navy) +
      limb(X, CX - 6, 66, CX - 6, 88, 3.6, beak, true) + limb(X, CX + 6, 66, CX + 6, 88, 3.6, beak, true) +
      [CX - 6, CX + 6].map(x => `<path d="M${x} 88L${x - 6} ${G}M${x} 88L${x} ${G}M${x} 88L${x + 6} ${G}" stroke="${dk(beak)}" stroke-width="3.6" stroke-linecap="round"/><path d="M${x} 88L${x - 6} ${G}M${x} 88L${x} ${G}M${x} 88L${x + 6} ${G}" stroke="${beak}" stroke-width="2" stroke-linecap="round"/>`).join('') +
      neck(X, white) + torso(X, navy) + path(X, `M${CX - 12} 62Q${CX} 70 ${CX + 12} 62L${CX + 13} 72Q${CX} 78 ${CX - 13} 72Z`, navy) +
      path(X, `M${CX - 5} 44Q${CX} 42 ${CX + 5} 44L${CX + 3} 58Q${CX} 60 ${CX - 3} 58Z`, white, { noline: true, op: 0.9 }) +
      stroke(`M${CX - 10} 44L${CX + 8} 64`, dk('#5a3a1e'), 4) + stroke(`M${CX - 10} 44L${CX + 8} 64`, '#5a3a1e', 2.4) +
      path(X, `M${CX - 11} 40Q${CX} 36 ${CX + 11} 40Q${CX} 50 ${CX - 11} 40Z`, scarf) + path(X, poly([[CX - 11, 42], [CX - 16, 62], [CX - 6, 52]]), scarf) +
      limb(X, CX + 9, 30, CX + 13, 50, 3.4, navy) + stroke(`M${CX + 10} 37L${CX + 12.5} 37M${CX + 11} 44L${CX + 13.5} 44`, beak, 1.4) +
      head(X, navy, { cy: 26, rx: 11, ry: 11.5 }) + path(X, `M${CX - 8} 21Q${CX} 15 ${CX + 8} 21Q${CX + 8} 34 ${CX} 36Q${CX - 8} 34 ${CX - 8} 21Z`, white, { noline: true }) +
      path(X, poly([[CX - 4.5, 29], [CX + 4.5, 29], [CX, 38]]), beak) + stroke(`M${CX - 3.5} 32.5Q${CX} 33.5 ${CX + 3.5} 32.5`, dk(beak), 0.8),
    eyes: () => eyes({ iris: '#3fbf7f', y: 26, dx: 5, rx: 2.2, ry: 2.6, browC: mix(navy, INK, 0.5), browW: 1.4, tilt: 1.2 }), happy: () => happy({ y: 26, dx: 5, browC: mix(navy, INK, 0.5), browW: 1.4 }) });
}
// ---- Urbosa: Gerudo chief, red hair, gold jewellery, green top and white trousers
{
  const skin = '#b67a4e', hair = '#d94a3a', gold = '#e4b544', green = '#3a8f5c', white = '#f0f1f5', emerald = '#39c27a';
  CH.urbosa = make({ id: 'U', name: '乌尔波扎（荒野之息）', biome: 'desert', bg: { dark: '#2a1d10', light: '#f3e6cf' }, tile: ['#e0b56a', '#a8743a', '#8a5a2a'], shadow: 24,
    arm: { c: skin, skin, cuff: gold, w: 6, extra: stroke(`M${CX + 13.5} 52L${CX + 19} 52`, gold, 2.2) },
    draw: X => path(X, `M${CX + 8} 12Q${CX + 30} 16 ${CX + 22} 60Q${CX + 24} 36 ${CX + 6} 22Z`, hair) + ell(X, CX, 22, 13.5, 13, hair) +
      stroke(`M${CX - 24} 64Q${CX - 32} 78 ${CX - 24} 92`, dk(gold), 4) + stroke(`M${CX - 24} 64Q${CX - 32} 78 ${CX - 24} 92`, gold, 2.4) + stroke(`M${CX - 21} 62L${CX - 26} 66`, '#8a5a2a', 3) +
      farArm(X, skin, skin, { len: 62 }) + stroke(`M${CX - 13.5} 52L${CX - 19} 52`, gold, 2.2) + limb(X, CX - 16.4, 61, CX - 16.6, 63, 6.4, gold, true) +
      path(X, `M${CX - 12} 60L${CX + 12} 60L${CX + 17} 84Q${CX + 17} 88 ${CX + 13} 88L${CX + 2} 88L${CX} 84L${CX - 2} 88L${CX - 13} 88Q${CX - 17} 88 ${CX - 17} 84Z`, white) +
      limb(X, CX - 7, 88, CX - 7, 92, 7, gold, true) + limb(X, CX + 7, 88, CX + 7, 92, 7, gold, true) +
      path(X, `M${CX - 12} 90L${CX - 2} 90L${CX - 1} ${G}L${CX - 14} ${G}Z`, skin) + path(X, `M${CX + 12} 90L${CX + 2} 90L${CX + 1} ${G}L${CX + 14} ${G}Z`, skin) +
      neck(X, skin) + path(X, `M${CX - 15} 47Q${CX - 12} 42 ${CX - 6} 42L${CX + 6} 42Q${CX + 12} 42 ${CX + 15} 47L${CX + 13} 56L${CX - 13} 56Z`, skin, { noline: false }) +
      path(X, `M${CX - 14} 46Q${CX} 42 ${CX + 14} 46L${CX + 12} 54Q${CX} 57 ${CX - 12} 54Z`, green) + stroke(`M${CX - 14} 46Q${CX} 42 ${CX + 14} 46`, gold, 1.4) +
      path(X, `M${CX - 12} 58L${CX + 12} 58L${CX + 12} 63L${CX - 12} 63Z`, gold) + `<circle cx="${CX}" cy="60.5" r="2.2" fill="${emerald}" stroke="${INK}" stroke-width=".6"/>` +
      path(X, poly([[CX + 8, 63], [CX + 14, 84], [CX + 4, 66]]), '#c8403a') +
      head(X, skin) + `<circle cx="${CX - 12}" cy="32" r="2" fill="${gold}" stroke="${INK}" stroke-width=".6"/><circle cx="${CX + 12}" cy="32" r="2" fill="${gold}" stroke="${INK}" stroke-width=".6"/>` +
      cap(X, hair, [[CX - 11.5, 30], [CX - 9, 24], [CX - 5, 19], [CX - 1, 17.5], [CX + 1, 17.5], [CX + 5, 19], [CX + 9, 24], [CX + 11.5, 30]], { top: 9 }) +
      path(X, `M${CX - 11} 21Q${CX} 15 ${CX + 11} 21L${CX + 11} 23.5Q${CX} 18 ${CX - 11} 23.5Z`, gold) + `<path d="M${CX} 15.5L${CX + 2.2} 18.5L${CX} 21.5L${CX - 2.2} 18.5Z" fill="${emerald}" stroke="${INK}" stroke-width=".6"/>` +
      stroke(`M${CX - 3} 32.5Q${CX} 34.5 ${CX + 3} 32.5`, '#7a2a2a', 1.2) + blush(skin),
    eyes: () => eyes({ iris: '#3fbf7f', browC: '#8a2a1e', browW: 1.3, tilt: 0.8 }), happy: () => happy({ browC: '#8a2a1e', browW: 1.3 }) });
}
// ---- Daruk: Goron champion, broad and rocky, white mane and beard
{
  const skin = '#b8855a', rock = '#55403a', mane = '#f3ede3', sash = '#3b7fd1', belt = '#4a3a2e';
  const spiky = (cx, cy, r, n, amp) => poly(Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI * i / n - Math.PI / 2, rr = r + (i % 2 ? -amp : amp); return [n1(cx + rr * Math.cos(a)), n1(cy + rr * Math.sin(a))]; }));
  CH.daruk = make({ id: 'D', name: '达尔克尔（荒野之息）', biome: 'volcano', bg: { dark: '#2a1410', light: '#f3dcd2' }, tile: ['#7a4a3a', '#4a2a22', '#3a1f1a'], shadow: 34,
    arm: { c: skin, skin, sx: CX + 29, sy: 52, len: 18, w: 11, hand: 5.5 },
    draw: X => path(X, spiky(CX, 50, 33, 11, 4), rock) + path(X, spiky(CX - 18, 44, 10, 5, 2.5), rock) + path(X, spiky(CX + 18, 44, 10, 5, 2.5), rock) +
      limb(X, CX - 27, 52, CX - 33, 70, 11, skin) + ell(X, CX - 34, 74, 5.5, 5.5, skin) + path(X, spiky(CX - 34, 72, 5, 4, 1.5), rock, { op: 0.8 }) +
      limb(X, CX - 11, 78, CX - 12, 88, 11, skin) + limb(X, CX + 11, 78, CX + 12, 88, 11, skin) +
      path(X, `M${CX - 19} 87L${CX - 5} 87L${CX - 4} ${G}L${CX - 22} ${G}Z`, skin) + path(X, `M${CX + 19} 87L${CX + 5} 87L${CX + 4} ${G}L${CX + 22} ${G}Z`, skin) +
      path(X, `M${CX - 26} 50Q${CX} 40 ${CX + 26} 50L${CX + 25} 78Q${CX} 90 ${CX - 25} 78Z`, skin) + ell(X, CX, 70, 13, 8.5, mix(skin, '#fff6dc', 0.18), { noline: true, op: 0.7 }) +
      stroke(`M${CX - 20} 48L${CX + 16} 80`, dk(sash), 7) + stroke(`M${CX - 20} 48L${CX + 16} 80`, sash, 5) +
      path(X, `M${CX - 25} 76L${CX + 25} 76L${CX + 25} 81L${CX - 25} 81Z`, belt) + path(X, `M${CX - 3} 75.5L${CX + 3} 75.5L${CX + 3} 81.5L${CX - 3} 81.5Z`, '#e4b544') +
      path(X, spiky(CX, 26, 17, 9, 3.5), mane) + ell(X, CX, 30, 12.5, 11.5, skin) + hi(CX - 5, 23, 4, 2, 0.28, -20) +
      path(X, `M${CX - 11} 33Q${CX} 54 ${CX + 11} 33Q${CX} 40 ${CX - 11} 33Z`, mane) + path(X, `M${CX - 7} 32Q${CX} 38 ${CX + 7} 32Q${CX} 35 ${CX - 7} 32Z`, mane, { noline: true }) +
      `<path d="M${CX - 3} 34Q${CX} 36.5 ${CX + 3} 34Z" fill="${INK}"/>` + stroke(`M${CX - 3} 34Q${CX} 36.5 ${CX + 3} 34`, '#ffffff', 0.9),
    eyes: () => eyes({ y: 27.5, dx: 5.5, rx: 2, ry: 2.4, iris: '#3b2a20', browC: mane, browW: 2.6 }), happy: () => happy({ y: 27.5, browC: mane, browW: 2.6 }) });
}
// ---- the old man of the Great Plateau: hood, cloak, long beard and a walking staff
{
  const skin = '#e3bb95', hood = '#c9b48c', robe = '#7d6248', beard = '#f1ece4', wood = '#8a5a30';
  CH.sage = make({ id: 'S', name: '老人（荒野之息）', biome: 'ruins', bg: { dark: '#1e1c14', light: '#ece6d6' }, tile: ['#a89a78', '#6a5a44', '#4e4232'], shadow: 26,
    arm: { c: hood, skin, w: 8, len: 18 },
    draw: X => limb(X, CX - 19, 16, CX - 17, 92, 3, wood, true) + ell(X, CX - 19.3, 15, 3, 3, mix(wood, '#ffffff', 0.15)) +
      limb(X, CX - 13, 46, CX - 17, 58, 8, hood) + ell(X, CX - 17.5, 61, 3.4, 3.4, skin) +
      path(X, `M${CX - 14} 44L${CX + 14} 44L${CX + 20} 90Q${CX + 20} 92 ${CX + 18} 92L${CX - 18} 92Q${CX - 20} 92 ${CX - 20} 90Z`, hood) +
      path(X, `M${CX - 9} 92L${CX - 2} 92L${CX - 2} ${G}L${CX - 11} ${G}Z`, robe) + path(X, `M${CX + 9} 92L${CX + 2} 92L${CX + 2} ${G}L${CX + 11} ${G}Z`, robe) +
      path(X, `M${CX - 8} 44L${CX + 8} 44L${CX + 10} 92L${CX - 10} 92Z`, robe, { noline: true, op: 0.9 }) + stroke(`M${CX - 8} 44L${CX - 10} 92M${CX + 8} 44L${CX + 10} 92`, dk(hood), 0.8) +
      path(X, `M${CX - 14} 66L${CX + 14} 66L${CX + 14} 70L${CX - 14} 70Z`, '#5a4634') +
      path(X, `M${CX - 12} 34Q${CX - 15} 10 ${CX} 8Q${CX + 15} 10 ${CX + 12} 34Q${CX + 15} 42 ${CX + 14} 46L${CX - 14} 46Q${CX - 15} 42 ${CX - 12} 34Z`, hood) +
      `<ellipse cx="${CX}" cy="28" rx="8.5" ry="10" fill="${mix(hood, INK, 0.6)}"/>` + ell(X, CX, 29, 7.5, 8.5, skin, { noline: true }) +
      path(X, `M${CX - 7} 32Q${CX} 64 ${CX + 7} 32Q${CX} 38 ${CX - 7} 32Z`, beard) + path(X, `M${CX - 5} 31Q${CX} 36 ${CX + 5} 31Q${CX} 33.5 ${CX - 5} 31Z`, beard, { noline: true }) +
      stroke(`M${CX - 2} 33Q${CX} 34.5 ${CX + 2} 33`, '#5a3a2a', 0.9),
    eyes: () => eyes({ y: 27.5, dx: 4.5, rx: 1.8, ry: 1.9, iris: '#4a5a7a', browC: beard, browW: 2 }), happy: () => happy({ y: 27.5, dx: 4.5, browC: beard, browW: 2 }) });
}
module.exports = { CH };
