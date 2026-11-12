'use strict';
// HD-2D scene layers for the header mascot: blurred far shapes, light shafts, bloom and floating motes (backdrop),
// plus a blurred out-of-focus foreground with meadow flowers (front). One biome per character.
const M = require('./mascots');
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');

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
    case 'ruins': return `<g fill="${b}">${[600, 680, 760, 840].map(x => `<rect x="${x}" y="54" width="12" height="68"/>`).join('')}<rect x="596" y="46" width="268" height="10"/></g>` +
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
module.exports = { BIOME, backdrop, front, mix };
