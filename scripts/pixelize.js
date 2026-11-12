'use strict';
// One-off tool: rasterises the vector characters in vec.js with headless Chrome and snaps them to a pixel grid,
// writing scripts/pix-data.json (palette-indexed rows per frame). The daily generator only reads that JSON.
//   node scripts/pixelize.js [cell=2]
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { CH } = require('./vec');
const CELL = +process.argv[2] || 2, S = 4, CX = 98, X0 = CX - 44, W = 88, H = 98;
const FRAMES = ['body', 'eyes', 'happy', 'down', 'up1', 'up2'];
const jobs = [];
for (const [id, c] of Object.entries(CH)) for (const f of FRAMES) {
  const r = c.raw;
  const inner = f === 'body' ? r.body : r[f];
  jobs.push({ id, f, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="${X0} 0 ${W} ${H}"><defs>${r.defs}</defs>${inner}</svg>` });
}
const page = `<body><pre id="o"></pre><script>
const jobs=${JSON.stringify(jobs)},CELL=${CELL},S=${S},W=${W},H=${H};
const hex=v=>v.toString(16).padStart(2,'0');
function load(svg){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)})}
(async()=>{const out={};const cv=document.createElement('canvas');cv.width=W*S;cv.height=H*S;const cx=cv.getContext('2d',{willReadFrequently:true});
for(const j of jobs){const img=await load(j.svg);cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(img,0,0);const d=cx.getImageData(0,0,cv.width,cv.height).data;
const cs=CELL*S,cols=W/CELL,rows=H/CELL,res=[];
for(let r=0;r<rows;r++){let line='';for(let c=0;c<cols;c++){let a=0,n=0;const b={};
for(let y=0;y<cs;y++)for(let x=0;x<cs;x++){const k=((r*cs+y)*cv.width+c*cs+x)*4,al=d[k+3];a+=al;if(al>200){n++;const q=(d[k]>>4)+','+(d[k+1]>>4)+','+(d[k+2]>>4);(b[q]=b[q]||[0,0,0,0]);const e=b[q];e[0]+=d[k];e[1]+=d[k+1];e[2]+=d[k+2];e[3]++}}
const face=j.f==='eyes'||j.f==='happy';
if(a/(cs*cs*255)<(face?0.4:0.45)||!n){line+='.';continue}
let best=null;const lum=e=>(e[0]+e[1]+e[2])/e[3];
for(const q in b){if(face){if(b[q][3]>=8&&(!best||lum(b[q])<lum(best)))best=b[q]}else if(!best||b[q][3]>best[3])best=b[q]}
if(!best){line+='.';continue}
line+='#'+hex(Math.round(best[0]/best[3]))+hex(Math.round(best[1]/best[3]))+hex(Math.round(best[2]/best[3]))+' '}
res.push(line)}
(out[j.id]=out[j.id]||{})[j.f]=res}
document.getElementById('o').textContent=JSON.stringify(out);document.title='done'})();
</script></body>`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pix-')), html = path.join(tmp, 'p.html');
fs.writeFileSync(html, page);
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dom = cp.execFileSync(chrome, ['--headless', '--disable-gpu', '--virtual-time-budget=60000', '--dump-dom', 'file://' + html], { maxBuffer: 1 << 28 }).toString();
const raw = JSON.parse(dom.match(/<pre id="o">([\s\S]*?)<\/pre>/)[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
// palette-index the rows: each row is a string of '.' or '#rrggbb ' tokens
const data = { cell: CELL, x0: X0, w: W / CELL, h: H / CELL, chars: {} };
// weighted median-cut palette (like libimagequant / pngquant do), so each character keeps <= 34 colours and every cell is one base-36 char
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hx = a => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function medianCut(counts, k) {
  let boxes = [Object.entries(counts).map(([h, n]) => ({ c: rgb(h), n }))];
  while (boxes.length < k) {
    let bi = -1, bs = 0, bch = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let ch = 0; ch < 3; ch++) { const v = b.map(p => p.c[ch]), s = (Math.max(...v) - Math.min(...v)) * Math.sqrt(b.reduce((a, p) => a + p.n, 0)); if (s > bs) { bs = s; bi = i; bch = ch; } } });
    if (bi < 0) break;
    const b = boxes[bi].sort((p, q) => p.c[bch] - q.c[bch]), half = b.reduce((a, p) => a + p.n, 0) / 2;
    let acc = 0, cut = 1; for (let i = 0; i < b.length - 1; i++) { acc += b[i].n; if (acc >= half) { cut = i + 1; break; } cut = i + 1; }
    boxes.splice(bi, 1, b.slice(0, cut), b.slice(cut));
  }
  return boxes.map(b => { const n = b.reduce((a, p) => a + p.n, 0); return [0, 1, 2].map(ch => b.reduce((a, p) => a + p.c[ch] * p.n, 0) / n); });
}
for (const id in raw) {
  const counts = {};
  for (const f of FRAMES) for (const line of raw[id][f]) for (const t of line.match(/#[0-9a-f]{6}/g) || []) counts[t] = (counts[t] || 0) + 1;
  const palRGB = medianCut(counts, 34), pal = palRGB.map(hx), memo = {};
  const near = h => memo[h] || (memo[h] = (() => { const c = rgb(h); let bi = 0, bd = 1e9; palRGB.forEach((p, i) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi.toString(36); })());
  const fr = {};
  for (const f of FRAMES) fr[f] = raw[id][f].map(line => (line.match(/\.|#[0-9a-f]{6}/g) || []).map(t => t === '.' ? '.' : near(t)).join(''));
  data.chars[id] = { pal, ...fr };
}
fs.writeFileSync(path.join(__dirname, 'pix-data.json'), JSON.stringify(data));
console.log('wrote pix-data.json', Object.keys(data.chars).map(k => k + ':' + data.chars[k].pal.length).join(' '));
