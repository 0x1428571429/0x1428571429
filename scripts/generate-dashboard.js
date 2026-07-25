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

function pickQuote(quotes) {
  if(!quotes||!quotes.length) return null;
  const i=Math.floor(Math.random()*quotes.length);
  return quotes[i];
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
function genHeader(theme, u, quote) {
  const stats=[
    ['stars', u ? fmt((u.public_repos||0)) : '-'],
    ['repos', u ? fmt(u.public_repos||0) : '-'],
    ['followers', u ? fmt(u.followers||0) : '-'],
  ];
  const hasQuote = quote && quote.en;
  const h = hasQuote ? 128 : 90;

  make(`header.${theme}.svg`, theme, h, t => {
    let o = '';
    o += `<text x="${P}" y="16" fill="${t.dim}" font-size="10" font-family="${MONO}">${USER}</text>\n`;
    o += `<text x="${P}" y="40" fill="${t.text}" font-size="22" font-family="${SANS}" font-weight="600">${NAME}</text>\n`;
    if(hasQuote) {
      o+=`<text x="${P}" y="60" fill="${t.dim}" font-size="11" font-family="${SANS}">${esc(tr(quote.en,85))}</text>\n`;
      o+=`<text x="${P}" y="74" fill="${t.dim}" font-size="10" font-family="${MONO}">${esc('—— '+quote.author)}</text>\n`;
    }
    const lineY = hasQuote ? 92 : 68;
    const statY = lineY + 18;
    o += `<line x1="${P}" y1="${lineY}" x2="${W-P}" y2="${lineY}" stroke="${t.border}" stroke-width="1"/>\n`;

    stats.forEach(([l,v],i)=>{
      const sx=P+i*160;
      o+=`<text x="${sx}" y="${statY}" fill="${t.text}" font-size="12" font-family="${MONO}">${v}</text>\n`;
      o+=`<text x="${sx+40}" y="${statY}" fill="${t.dim}" font-size="11" font-family="${MONO}">${l}</text>\n`;
    });
    return o;
  });
}

const LCOL = 155;

function genList(theme, name, file, items) {
  if(!items.length) return;
  const h = 72+items.length*IH;
  make(`${file}.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="38" fill="${t.text}" font-size="28" font-family="${SANS}" font-weight="600">${name}</text>\n`;
    items.forEach((item,i)=>{
      const by=72+i*IH;
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${item.left}</text>\n`;
      o+=`<text x="${P+LCOL}" y="${by}" fill="${t.text}" font-size="14" font-family="${SANS}">${tr(item.right,65)}</text>\n`;
    });
    return o;
  });
}

function genBlog(theme, posts) {
  genList(theme, 'Blog', 'blog', posts.map(p=>({left:p.date, right:p.title})));
}

function genActivity(theme, events) {
  genList(theme, 'Activity', 'activity', events.slice(0,5).map(e=>({left:ago(new Date(e.created_at)), right:evDesc(e)})));
}

function genProjects(theme, repos) {
  const sorted = Array.isArray(repos)&&repos.length ? repos.filter(r=>!r.fork).sort((a,b)=>b.stargazers_count-a.stargazers_count).slice(0,5) : [];
  const items = sorted.length ? sorted.map(r=>({left:fmt(r.stargazers_count||0)+' ★', right:r.name})) : [{left:'★', right:'time-friend.com'}];
  genList(theme, 'Project', 'project', items);
}

async function main() {
  console.log('Fetching...');
  let u, repos, events, rss, quotes;
  try {
    [u, repos, events, rss, quotes] = await Promise.all([
      fetchJSON(`https://api.github.com/users/${USER}`, TOKEN).catch(()=>null),
      fetchJSON(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`, TOKEN).catch(()=>[]),
      fetchJSON(`https://api.github.com/users/${USER}/events?per_page=10`, TOKEN).catch(()=>[]),
      fetchText('https://time-friend.com/en/index.xml').catch(()=>''),
      fetchJSON('https://time-friend.com/data/quotes.json', '').catch(()=>null),
    ]);
  } catch(e) { u=null; repos=[]; events=[]; rss=''; quotes=null; }

  console.log('Processing...');
  const stars = Array.isArray(repos)?repos.reduce((s,r)=>s+(r.stargazers_count||0),0):0;
  const langs = {};
  if(Array.isArray(repos)) repos.forEach(r=>{if(r.language) langs[r.language]=(langs[r.language]||0)+1;});
  const posts = parseRSS(rss);
  const evs = Array.isArray(events)?events.filter(e=>e.repo && e.type==='WatchEvent'):[];
  const quote = pickQuote(quotes);

  console.log('Generating...');
  for(const theme of['dark','light']){
    genHeader(theme, u, quote);
    genBlog(theme, posts);
    genActivity(theme, evs);
    genProjects(theme, repos);
    console.log(`  ${theme} done`);
  }
  console.log('All OK!');
}

main().catch(e=>{console.error(e);process.exit(1);});
