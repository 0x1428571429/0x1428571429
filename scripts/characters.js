'use strict';
// Alternative original characters (same 17x12 grid & pose interface as ROBOT) for the festival scenes.
const M = require('./mascots');
const { sprite, ROBOT: R } = M;
const sw = (rows, from, to) => rows.map(s => s.replace(new RegExp(from, 'g'), to));
function make(c) {
  const arm = x => sw(x, 'O', c.arm), P = a => sprite(arm(a[0]), a[1]);
  return {
    name: c.name, pal: c.pal, get antenna() { return c.horn ? c.horn() : ''; },
    body: (left = true) => sprite(left ? c.rows : c.rows.map((r, i) => (i === 3 || i === 4 ? '..' + r.slice(2) : r)), 2) + (c.extra ? c.extra() : ''),
    get eyes() { return sprite(c.eyes, c.eyesRow); },
    get happy() { return sprite(c.happy, c.eyesRow); },
    get armDown() { return P([['..............OO.', '..............OO.'], 5]); },
    get up1() { return P([Array(4).fill('..............OO.'), 3]); },
    get up2() { return P([['...............OO', '...............OO', '..............OO.', '..............OO.'], 3]); },
    get legs() { return sprite(sw(['...D.D....D.D....', '...D.D....D.D....'], 'D', c.leg), 10); },
  };
}
const CH = {
  droid: make({ name: '圆顶机器人', arm: 'A', leg: 'E', pal: { A: '#e6e9ee', E: '#3a3f4b' },
    rows: ['.....AAAAAA......', '....AAAAAAAA.....', '...AZAAAAAAZA....', 'AAAAAAAAAAAAAA...', 'AAAAAAAAAAAAAA...', '...AZAZAAZAZA....', '...AAAAAAAAAA....', '...ZZZZZZZZZZ....'],
    eyesRow: 3, eyes: ['......KKKK.......', '......KBBK.......'], happy: ['......KKKK.......', '......KYYK.......'] }),
  sage: make({ name: '绿色小贤者', arm: 'M', leg: 'N', pal: { J: '#8fbf5a', j: '#5f8f3a', M: '#8a6a45', N: '#5a4128' },
    rows: ['....JJJJJJJJ.....', '.JJJJJJJJJJJJJJ..', 'jJJJJJJJJJJJJJJj.', 'MMMMMMMMMMMMMM...', 'MMMMMMMMMMMMMM...', '...MMMMMMMMMM....', '...MMMMMMMMMM....', '...NNNNNNNNNN....'],
    eyesRow: 3, eyes: ['....WK....WK.....', '....KK....KK.....'], happy: ['.....K....K......', '....K.K..K.K.....'] }),
  knight: make({ name: '黑盔骑士', arm: 'I', leg: 'E', pal: { I: '#1d1d24', E: '#3a3f4b', R: '#ef5b6b', F: '#5a5a66' },
    rows: ['....IIIIIIII.....', '...IIFFFFFFII....', '...IIIIIIIIII....', 'IIIIIIIIIIIIII...', 'IIIIIIIIIIIIII...', '...IIRRIIRRII....', '...IIIIIIIIII....', '...EEEEEEEEEE....'],
    eyesRow: 4, eyes: ['....RR....RR.....'], happy: ['....RRR..RRR.....'] }),
  penguin: make({ name: '像素企鹅', arm: 'I', leg: 'Q', pal: { I: '#1d2433', W: '#ffffff', Q: '#f08a24' },
    rows: ['....IIIIIIII.....', '...IIIIIIIIII....', '...IIIIIIIIII....', 'IIIIWWWWWWWWII...', 'IIIIWWWWWWWWII...', '...IWWWWWWWWI....', '...IWWWWWWWWI....', '...IIIIIIIIII....'],
    extra: () => sprite(['.......QQ........'], 5), eyesRow: 3, eyes: ['....WK....WK.....', '....KK....KK.....'], happy: ['.....K....K......', '....K.K..K.K.....'] }),
  mech: make({ name: '变形机甲', arm: 'R', leg: 'E', pal: { Z: '#2f5fd0', R: '#d8343f', F: '#aab2c0', E: '#3a3f4b' },
    rows: ['...Z.ZZZZZZ.Z....', '...ZZZZZZZZZZ....', '...ZZFFFFFFZZ....', 'RRRRRRRRRRRRRR...', 'RRRRRRRRRRRRRR...', '...RRBBRRBBRR....', '...RRRRRRRRRR....', '...ZZZZZZZZZZ....'],
    eyesRow: 4, eyes: ['.....BB..BB......'], happy: ['.....YY..YY......'] }),
  wizard: make({ name: '圆眼镜小巫师', arm: 'I', leg: 'E', pal: { I: '#1d1d24', E: '#3a3f4b', N: '#6b4a2b', R: '#ef5b6b', Y: '#facc15' },
    rows: ['....IIIIIIII.....', '...IIIIIIIIII....', '...ICCCCCCCCI....', 'IIIICCCCCCCCII...', 'IIIIRRYYRRYYII...', '...IIIIIIIIII....', '...IIIIIIIIII....', '...EEEEEEEEEE....'],
    eyesRow: 4, eyes: ['....NNN..NNN.....', '....NKN..NKN.....'], happy: ['....NNN..NNN.....', '....NNN..NNN.....'] }),
  eva: make({ name: '紫绿机甲', arm: 'U', leg: 'E', pal: { U: '#7b3fa8', L: '#a974d6', G: '#5ad06a', E: '#3a3f4b', Y: '#facc15' },
    horn: () => sprite(['.......GG........'], 1),
    rows: ['....UUUUUUUU.....', '...UULLLLLLUU....', '...UUUUUUUUUU....', 'UUUUUUUUUUUUUU...', 'UUUUUUUUUUUUUU...', '...UUGGUUGGUU....', '...UUUUUUUUUU....', '...EEEEEEEEEE....'],
    eyesRow: 3, eyes: ['....YY....YY.....'], happy: ['....YYY..YYY.....'] }),
  owl: make({ name: '猫头鹰', arm: 'M', leg: 'Q', pal: { M: '#8a6a45', C: '#f1dcb8', c: '#cda878', Q: '#f08a24' },
    extra: () => sprite(['.......QQ........'], 5),
    rows: ['...M.MMMMMM.M....', '...MMMMMMMMMM....', '...MMMMMMMMMM....', 'MMMMCCCCCCCCMM...', 'MMMMCCCCCCCCMM...', '...MCCcCCcCCM....', '...MCCCCCCCCM....', '...MMMMMMMMMM....'],
    eyesRow: 3, eyes: ['....WWW..WWW.....', '....WKW..WKW.....'], happy: ['....KKK..KKK.....'] }),
};
module.exports = { CH };
