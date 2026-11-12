'use strict';
// Original pixel characters with their own silhouettes (17 cols x 12 rows grid, ground at row 11).
// Shared pose interface used by the festival scenes: body, eyes, happy, armDown, up1, up2, legs, antenna + hat/hold anchors.
const M = require('./mascots');
const { sprite } = M;
const W = 17;

// pad one empty row above/below and draw an outline ('o') in empty cells touching a filled cell
function outlined(rows) {
  const g = ['.'.repeat(W), ...rows, '.'.repeat(W)];
  return g.map((r, y) => [...r].map((ch, x) => {
    if (ch !== '.') return ch;
    const n = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].some(([yy, xx]) => g[yy] && g[yy][xx] && g[yy][xx] !== '.');
    return n ? 'o' : '.';
  }).join(''));
}
// compact row DSL: 'c2 .3 ...' = char followed by count, tokens separated by spaces (must sum to 17)
const row = spec => { const r = spec.trim().split(/\s+/).map(t => t[0].repeat(+t.slice(1))).join(''); if (r.length !== W) throw new Error('row width ' + r.length + ': ' + spec); return r; };
const put = (row, col, s) => row.slice(0, col) + s + row.slice(col + s.length);
const E = '.'.repeat(W);
const pad = (col, s) => ('.'.repeat(col) + s + '.'.repeat(W)).slice(0, W);

function make(c) {
  const top = 11 - c.rows.length - (c.lift || 0);           // absolute row of rows[0]
  const A = c.arm;                          // {col, idx, ch}: the waving nub on the right side
  const ar = top + A.idx;
  const frame = (r0, rows) => sprite(rows, r0);
  return {
    name: c.name, pal: Object.assign({ o: '#262b3d' }, c.pal), bg: c.bg, tile: c.tile, antenna: '',
    hatRow: top + c.hat - 2, hatCol: c.hatCol || 0, holdDy: c.holdDy == null ? 1 : c.holdDy,
    body: () => sprite(outlined(c.rows), top - 1) + (c.deco ? sprite(c.deco, top) : ''),
    get eyes() { return sprite(c.eyes[1], top + c.eyes[0]); },
    get happy() { return sprite(c.happy[1], top + c.happy[0]); },
    get armDown() { return frame(ar, [pad(A.col, A.ch.repeat(2)), pad(A.col, A.ch.repeat(2))]); },
    get up1() { return frame(ar - 2, [0, 1, 2, 3].map(() => pad(A.col, A.ch.repeat(2)))); },
    get up2() { return frame(ar - 2, [pad(A.col + 1, A.ch), pad(A.col + 1, A.ch), pad(A.col, A.ch.repeat(2)), pad(A.col, A.ch.repeat(2))]); },
    get legs() { return ''; },
  };
}

const CH = {
  slime: make({ name: '果冻史莱姆', bg: { dark: '#10272a', light: '#d9efee' }, pal: { 1: '#2bb3a3', 2: '#1f8a80' },
    rows: ['......11111......', '....111111111....', '...11111111111...', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '...22222222222...', '....222222222....'],
    deco: [E, E, put(E, 5, 'W'), put(E, 4, 'W')],
    eyes: [4, ['.....KK...KK.....', '.....KK...KK.....', '.......KKK.......']], happy: [4, ['.....K.....K.....', '....K.K...K.K....', '......KKKKK......']],
    arm: { col: 15, idx: 6, ch: '1' }, hat: 1 }),
  ghost: make({ name: '小幽灵', bg: { dark: '#1c1830', light: '#e7e2f6' }, pal: { 1: '#b9a8f5', 2: '#8f7fd6' },
    rows: ['.....1111111.....', '...11111111111...', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..11.111.111.11..'],
    eyes: [3, ['.....KK...KK.....', '.....KK...KK.....', '', '.......KK........']], happy: [3, ['.....K.....K.....', '....K.K...K.K....', '', '......KKKK.......']],
    arm: { col: 15, idx: 5, ch: '1' }, hat: 1 }),
  fox: make({ name: '冰蓝狐狸', bg: { dark: '#141d33', light: '#dde4f7' }, pal: { 1: '#6f86ff', 2: '#4a5fd1', 3: '#f6efe0' },
    rows: ['...11.......11...', '...111.....111...', '...11111111111...', '..1111111111111..', '..1133111113311..', '...11333333311...', '....111111111....', '....113333311....', '....113333311....', '...111.....111...'],
    deco: [E, E, E, E, E, put(E, 8, 'K')],
    eyes: [3, ['.....KK...KK.....']], happy: [3, ['.....K.....K.....', '....K.K...K.K....']],
    arm: { col: 13, idx: 7, ch: '1' }, hat: 2 }),
  frog: make({ name: '青蛙', bg: { dark: '#0f2a18', light: '#d9f0de' }, pal: { 1: '#4cc16b', 2: '#2f8f4d', 3: '#d6f5c2' },
    rows: ['...111.....111...', '..11111...11111..', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..1133333333311..', '...13333333331...', '...13333333331...', '..1111.....1111..'],
    eyes: [1, ['...WKW.....WKW...', '', '', '....KKKKKKKKK....']], happy: [1, ['...KKK.....KKK...', '', '', '....KKKKKKKKK....', '.....KKKKKKK.....']],
    arm: { col: 15, idx: 6, ch: '1' }, hat: -1, holdDy: 2 }),
  mushroom: make({ name: '小蘑菇', bg: { dark: '#2a1418', light: '#f6dcdf' }, pal: { 1: '#e5484d', 3: '#f3e6cf' },
    rows: ['.....1111111.....', '...11111111111...', '..11WW11111WW11..', '..1111111111111..', '..11111WW111111..', '.....3333333.....', '.....3333333.....', '.....3333333.....', '....333333333....'],
    eyes: [5, ['......K...K......', '.......KKK.......']], happy: [5, ['......K...K......', '.....K.KKK.K.....']],
    arm: { col: 12, idx: 6, ch: '3' }, hat: 0, hatCol: 0 }),
  jelly: make({ name: '水母', bg: { dark: '#2a1426', light: '#f7dcee' }, pal: { 1: '#f08fb8', 2: '#d1648f' },
    rows: ['.....1111111.....', '...11111111111...', '..1111111111111..', '..1111111111111..', '..1111111111111..', '..2222222222222..', '..1.1.1.1.1.1.1..', '..1.1.1.1.1.1.1..', '...1.1.1.1.1.1...', '..1.1.1.1.1.1.1..'],
    eyes: [2, ['.....KK...KK.....', '.....KK...KK.....']], happy: [2, ['.....K.....K.....', '....K.K...K.K....']],
    arm: { col: 15, idx: 6, ch: '1' }, hat: 1 }),
  panda: make({ name: '熊猫', bg: { dark: '#1a1f1a', light: '#e4eadf' }, pal: { 1: '#f4f4f4', b: '#2b2b33' },
    rows: ['...bb.......bb...', '...bbb.....bbb...', '...11111111111...', '..1111111111111..', '..11bbb111bbb11..', '..11bbb111bbb11..', '..1111111111111..', '..bb111111111bb..', '...11111111111...', '...11111111111...', '...bbb.....bbb...'],
    deco: [E, E, E, E, E, E, put(E, 8, 'b')],
    eyes: [4, ['.....W.....W.....']], happy: [4, ['....WWW...WWW....']],
    arm: { col: 14, idx: 7, ch: 'b' }, hat: 2, holdDy: 2 }),
  rocket: make({ name: '小火箭', bg: { dark: '#121c33', light: '#dee6f6' }, pal: { 1: '#d5deee', 2: '#aab6d3', r: '#e5484d' },
    rows: ['........1........', '.......111.......', '......11111......', '......11111......', '.....1111111.....', '.....1111111.....', '.....1111111.....', '....111111111....', '...r111111111r...', '..rr111111111rr..', '..rr..22222..rr..'],
    eyes: [4, ['......K...K......', '.......KKK.......']], happy: [4, ['.....K.K.K.K.....', '......KKKKK......']],
    arm: { col: 14, idx: 8, ch: 'r' }, hat: 4, holdDy: 2 }),
};
Object.assign(CH, require('./botw').CH); // tall Breath-of-the-Wild style sprites
module.exports = { CH };
