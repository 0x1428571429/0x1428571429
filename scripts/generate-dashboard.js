const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USER = '0x1428571429';
const NAME = '0x142857';

const C = {
  dark: { bg: '#111111', text: '#e8e8e8', dim: '#666666', border: '#2a2a2a' },
  light: { bg: '#f5f5f5', text: '#2f3437', dim: '#888888', border: '#e8e8e8' },
};

const MONO = "'Geist Mono','SF Mono','JetBrains Mono',Menlo,monospace";
const SANS = "'SF Pro Display','Geist Sans','Helvetica Neue',system-ui,sans-serif";
const W = 960;
const P = 28;
const IH = 34;

function fetchJSON(url, tok) {
  const o = { headers: { 'User-Agent': 'gen' } };
  if (tok) o.headers['Authorization'] = `Bearer ${tok}`;
  return new Promise((res, rej) => {
    https.get(url, o, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } }); }).on('error', rej);
  });
}

function fetchText(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'gen' } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej);
  });
}

function parseRSS(x) {
  const r = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(x))) {
    const t = (m[1].match(/<title>(.*?)<\/title>/)||[])[1]||'';
    const d = (m[1].match(/<pubDate>(.*?)<\/pubDate>/)||[])[1]||'';
    r.push({ title: t.replace(/<!\[CDATA\[|\]\]>/g,'')||'-', date: d ? new Date(d).toISOString().slice(0,10) : '-' });
  }
  return r.slice(0, 10);
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function tr(s, n) { if(!s) return '-'; return s.length <= n ? s : s.slice(0,n-1)+'…'; }
function fmt(n) { if(n==null||isNaN(n)) return '-'; return n>=1000?(n/1000).toFixed(1)+'k':String(n); }
function ago(d) {
  try {
    const df=Date.now()-d.getTime(), m=Math.floor(df/60000);
    if(m<60) return m+'m ago'; const h=Math.floor(m/60);
    if(h<24) return h+'h ago'; const dd=Math.floor(h/24);
    return dd<30?dd+'d ago':d.toISOString().slice(0,10);
  } catch(e) { return '-'; }
}

function evDesc(e) {
  const r=(e.repo?.name)||'';
  return 'starred '+r;
}

const LC = {JavaScript:'#f0db4f',TypeScript:'#2f74c0',HTML:'#e44d26',CSS:'#264de4',Vue:'#41b883',Python:'#3572A5',Shell:'#666666','C++':'#004482'};

function make(name, theme, h, draw) {
  const t = C[theme];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">\n`;
  svg += `<rect width="${W}" height="${h}" fill="${t.bg}" rx="6"/>\n`;
  svg += draw(t);
  svg += '</svg>';
  fs.writeFileSync(name, svg);
}

// === HEADER ===
function genHeader(theme, u) {
  const bio = "\u{1F469}\u200D\u{1F4BB}\u{1F469}\u200D\u{1F4BB} 𝑺𝒐 𝑳𝒂 𝑺𝒊 𝑺𝒊 𝑺𝒊 𝑺𝒊 𝑳𝒂 𝑺𝒊 𝑳𝒂 𝑺𝒐 \u{1F469}\u200D\u{1F4BB}\u{1F469}\u200D\u{1F4BB}\n    \u{1F447}\u{1F447}\u{1F447}\u{1F447}\u{1F447}𝑭𝒐𝒍𝒍𝒐𝒘 𝒎𝒆\u{1F447}\u{1F447}\u{1F447}\u{1F447}\u{1F447}";
  const meta = (u && u.created_at) ? `joined ${new Date(u.created_at).toISOString().slice(0,7)}${u.location?' \u00b7 '+esc(u.location):''}` : '';
  const stats=[
    ['stars', u ? fmt((u.public_repos||0)) : '-'],
    ['repos', u ? fmt(u.public_repos||0) : '-'],
    ['followers', u ? fmt(u.followers||0) : '-'],
  ];
  const h = 180;

  make(`header.${theme}.svg`, theme, h, t => {
    let o = '';
    o += `<text x="${P}" y="30" fill="${t.dim}" font-size="12" font-family="${MONO}">${USER}</text>\n`;
    o += `<text x="${P}" y="62" fill="${t.text}" font-size="28" font-family="${SANS}" font-weight="600">${NAME}</text>\n`;
    if(bio) {
      const lines=bio.split('\n');
      lines.forEach((l,i)=> o+=`<text x="${P}" y="${88+i*20}" fill="${t.dim}" font-size="14" font-family="${SANS}">${esc(l)}</text>\n`);
    }
    if(meta) o += `<text x="${P}" y="${88+(bio?bio.split('\n').length:0)*20+4}" fill="${t.dim}" font-size="12" font-family="${MONO}">${meta}</text>\n`;
    o += `<line x1="${P}" y1="124" x2="${W-P}" y2="124" stroke="${t.border}" stroke-width="1"/>\n`;

    stats.forEach(([l,v],i)=>{
      const sx=P+i*160;
      o+=`<text x="${sx}" y="156" fill="${t.text}" font-size="14" font-family="${MONO}">${v}</text>\n`;
      o+=`<text x="${sx+50}" y="156" fill="${t.dim}" font-size="13" font-family="${MONO}">${l}</text>\n`;
    });
    return o;
  });
}

// === BLOG ===
function genBlog(theme, posts) {
  if(!posts.length) return;
    const h = 64+posts.length*IH;
  make(`blog.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="32" fill="${t.text}" font-size="28" font-family="${SANS}" font-weight="600">Blog</text>\n`;
    posts.forEach((p,i)=>{
      const by=64+i*IH;
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${p.date}</text>\n`;
      o+=`<text x="${P+150}" y="${by}" fill="${t.text}" font-size="14" font-family="${SANS}">${tr(p.title,65)}</text>\n`;
    });
    return o;
  });
}

// === ACTIVITY ===
function genActivity(theme, events) {
  if(!events.length) return;
  const n=Math.min(events.length,5), h=64+n*IH;
  make(`activity.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="32" fill="${t.text}" font-size="28" font-family="${SANS}" font-weight="600">Activity</text>\n`;
    events.slice(0,n).forEach((ev,i)=>{
      const by=64+i*IH;
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${ago(new Date(ev.created_at))}</text>\n`;
      o+=`<text x="${P+100}" y="${by}" fill="${t.text}" font-size="14" font-family="${SANS}">${tr(evDesc(ev),70)}</text>\n`;
    });
    return o;
  });
}

async function main() {
  console.log('Fetching...');
  let u, repos, events, rss;
  try {
    [u, repos, events, rss] = await Promise.all([
      fetchJSON(`https://api.github.com/users/${USER}`, TOKEN).catch(()=>null),
      fetchJSON(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`, TOKEN).catch(()=>[]),
      fetchJSON(`https://api.github.com/users/${USER}/events?per_page=10`, TOKEN).catch(()=>[]),
      fetchText('https://time-friend.com/en/index.xml').catch(()=>''),
    ]);
  } catch(e) { u=null; repos=[]; events=[]; rss=''; }

  console.log('Processing...');
  const stars = Array.isArray(repos)?repos.reduce((s,r)=>s+(r.stargazers_count||0),0):0;
  const langs = {};
  if(Array.isArray(repos)) repos.forEach(r=>{if(r.language) langs[r.language]=(langs[r.language]||0)+1;});
  const posts = parseRSS(rss);
  const evs = Array.isArray(events)?events.filter(e=>e.repo && e.type==='WatchEvent'):[];

  console.log('Generating...');
  for(const theme of['dark','light']){
    genHeader(theme, u);
    genBlog(theme, posts);
    genActivity(theme, evs);
    console.log(`  ${theme} done`);
  }
  console.log('All OK!');
}

main().catch(e=>{console.error(e);process.exit(1);});
