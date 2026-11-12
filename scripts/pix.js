'use strict';
// Pixel-art versions of the vector characters: reads scripts/pix-data.json (made by pixelize.js) and emits <rect> runs.
// Same pose interface as vec.js / characters.js.
const D = require('./pix-data.json');
const vec = require('./vec').CH;
const { backdrop, front } = require('./backdrop');
const CX = 98, G = 96;

function rects(rows, pal) {
  let o = '';
  rows.forEach((line, r) => {
    let c = 0;
    while (c < line.length) {
      const k = line[c];
      if (k === '.') { c++; continue; }
      let e = c; while (e < line.length && line[e] === k) e++;
      o += `<rect x="${D.x0 + c * D.cell}" y="${r * D.cell}" width="${(e - c) * D.cell}" height="${D.cell}" fill="${pal[parseInt(k, 36)]}"/>`;
      c = e;
    }
  });
  return o;
}
const CH = {};
for (const id of Object.keys(vec)) {
  const v = vec[id], d = D.chars[v.raw.id || Object.keys(vec).indexOf(id)] || D.chars[id];
  const r = k => rects(d[k], d.pal);
  CH[id] = {
    hd: true, name: v.name, pal: {}, bg: v.bg, tile: v.tile, antenna: '', holdDy: 0, hatRow: 0, hatCol: 0, bubbleR: 852, bubbleY: 4,
    body: () => `<ellipse cx="${CX}" cy="${G}" rx="${v.shadowRx}" ry="3.5" fill="#000" opacity=".28"/>` + r('body'),
    legs: '', eyes: r('eyes'), happy: r('happy'), armDown: r('down'), up1: r('up1'), up2: r('up2'),
    backdrop: v.backdrop, front: v.front,
  };
}
module.exports = { CH };
