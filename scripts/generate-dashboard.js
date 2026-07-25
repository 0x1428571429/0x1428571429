const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USER = '0x1428571429';

const C = {
  dark: { bg: '#1a1b2f', card: '#252641', text: '#e4e4f0', dim: '#9899b9', accent: '#ff7eb3' },
  light: { bg: '#fef6f0', card: '#fff5eb', text: '#2d2d44', dim: '#8a8aa8', accent: '#ff6b9d' },
};

const MONO = "Menlo,'Meslo LG','Helvetica Neue',monospace";
const UI = 'system-ui,-apple-system,sans-serif';
const W = 620;
const P = 24;

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
    const l = (m[1].match(/<link>(.*?)<\/link>/)||[])[1]||'';
    const d = (m[1].match(/<pubDate>(.*?)<\/pubDate>/)||[])[1]||'';
    r.push({ title: t.replace(/<!\[CDATA\[|\]\]>/g,''), link: l, date: d ? new Date(d).toISOString().slice(0,10) : '' });
  }
  return r.slice(0, 6);
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function tr(s, n) { return s.length <= n ? s : s.slice(0,n-1)+'…'; }
function fmt(n) { return n>=1000?(n/1000).toFixed(1)+'k':String(n); }
function ago(d) {
  const df=Date.now()-d.getTime(), m=Math.floor(df/60000);
  if(m<60) return m+'m'; const h=Math.floor(m/60);
  if(h<24) return h+'h'; const dd=Math.floor(h/24);
  return dd<30?dd+'d':d.toISOString().slice(0,10);
}

function evDesc(e) {
  const r=e.repo?.name||'';
  switch(e.type) {
    case'PushEvent': return 'push  '+r;
    case'CreateEvent': return 'create '+(e.payload?.ref_type||'')+'  '+r;
    case'IssuesEvent': return (e.payload?.action||'')+' issue  '+r;
    case'IssueCommentEvent': return 'comment  '+r;
    case'PullRequestEvent': return 'PR '+(e.payload?.action||'')+'  '+r;
    case'PullRequestReviewEvent': return 'review  '+r;
    case'WatchEvent': return 'star  '+r;
    case'ForkEvent': return 'fork  '+r;
    default: return r;
  }
}

function make(name, theme, h, draw) {
  const t = C[theme];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">\n`;
  svg += `<rect width="${W}" height="${h}" fill="${t.bg}" rx="12"/>\n`;
  svg += draw(t);
  svg += '</svg>';
  fs.writeFileSync(name, svg);
}

// === HEADER ===
function genHeader(theme, u, stars) {
  make(`header.${theme}.svg`, theme, 170, t => {
    const name = u.name||u.login;
    const bio = u.bio?tr(u.bio.trim().replace(/\s+/g,' '),50):'';
    let o = '';
    // Username like a title
    o += `<text x="${P}" y="30" fill="${t.accent}" font-size="14" font-family="${MONO}">${USER}</text>\n`;
    // Separator
    o += `<line x1="${P}" y1="42" x2="${W-P}" y2="42" stroke="${t.border||t.dim}" stroke-width="1" stroke-dasharray="3,3"/>\n`;
    // Name
    o += `<text x="${P}" y="70" fill="${t.text}" font-size="22" font-family="${UI}" font-weight="bold">${esc(name)}</text>\n`;
    if (bio) o += `<text x="${P}" y="92" fill="${t.dim}" font-size="12" font-family="${UI}">${esc(bio)}</text>\n`;
    o += `<text x="${P}" y="112" fill="${t.dim}" font-size="11" font-family="${MONO}">joined ${new Date(u.created_at).toISOString().slice(0,7)}${u.location?'  ·  '+esc(u.location):''}</text>\n`;
    // Stats
    const stats=[['stars',fmt(stars)],['repos',u.public_repos],['followers',fmt(u.followers)]];
    stats.forEach(([l,v],i)=>{
      const sx=P+i*140;
      o+=`<text x="${sx}" y="148" fill="${t.text}" font-size="14" font-family="${MONO}" font-weight="bold">${v}</text>\n`;
      o+=`<text x="${sx+60}" y="148" fill="${t.dim}" font-size="13" font-family="${MONO}">${l}</text>\n`;
    });
    return o;
  });
}

// === BLOG (Archive style) ===
function genBlog(theme, posts) {
  if(!posts.length) return;
  const ih=28, h=48+posts.length*ih;
  make(`blog.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${MONO}" font-weight="bold">Blog</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border||t.dim}" stroke-width="1" stroke-dasharray="3,3"/>\n`;
    posts.forEach((p,i)=>{
      const by=48+i*ih;
      o+=`<a href="${esc(p.link)}" target="_blank">\n`;
      o+=`  <text x="${P}" y="${by}" fill="${t.dim}" font-size="11" font-family="${MONO}">${p.date}</text>\n`;
      o+=`  <text x="${P+120}" y="${by}" fill="${t.text}" font-size="12" font-family="${MONO}">${tr(p.title,42)}</text>\n`;
      o+=`</a>\n`;
    });
    return o;
  });
}

// === LANGUAGES (Archive style) ===
function genLanguages(theme, langs) {
  const sorted=Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!sorted.length) return;
  const total=sorted.reduce((s,[,v])=>s+v,0), ih=28, h=48+sorted.length*ih;
  const lc={JavaScript:'#f1e05a',TypeScript:'#3178c6',HTML:'#e34c26',CSS:'#563d7c',Vue:'#4fc08d',Python:'#3572A5',Shell:'#89e051','C++':'#f34b7d'};
  make(`lang.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${MONO}" font-weight="bold">Languages</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border||t.dim}" stroke-width="1" stroke-dasharray="3,3"/>\n`;
    sorted.forEach(([lang,count],i)=>{
      const by=48+i*ih;
      const pct=total>0?count/total*100:0;
      const color=lc[lang]||t.accent;
      const bw=Math.max(10,240*pct/100);
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="11" font-family="${MONO}">${esc(lang)}</text>\n`;
      o+=`<rect x="130" y="${by-6}" width="${bw}" height="10" fill="${color}" rx="5"/>\n`;
      o+=`<text x="390" y="${by}" fill="${t.dim}" font-size="11" font-family="${MONO}">${pct.toFixed(1)}%</text>\n`;
    });
    return o;
  });
}

// === ACTIVITY (Archive style) ===
function genActivity(theme, events) {
  if(!events.length) return;
  const n=Math.min(events.length,5), ih=26, h=48+n*ih;
  make(`activity.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${MONO}" font-weight="bold">Activity</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border||t.dim}" stroke-width="1" stroke-dasharray="3,3"/>\n`;
    events.slice(0,n).forEach((ev,i)=>{
      const by=48+i*ih;
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="11" font-family="${MONO}">${ago(new Date(ev.created_at))}</text>\n`;
      o+=`<text x="${P+80}" y="${by}" fill="${t.text}" font-size="11" font-family="${MONO}">${tr(evDesc(ev),50)}</text>\n`;
    });
    return o;
  });
}

async function main() {
  console.log('Fetching...');
  const [u, repos, events, rss] = await Promise.all([
    fetchJSON(`https://api.github.com/users/${USER}`, TOKEN),
    fetchJSON(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`, TOKEN),
    fetchJSON(`https://api.github.com/users/${USER}/events?per_page=10`, TOKEN),
    fetchText('https://time-friend.com/en/index.xml').catch(()=>''),
  ]);

  console.log('Processing...');
  const stars = Array.isArray(repos)?repos.reduce((s,r)=>s+(r.stargazers_count||0),0):0;
  const langs = {};
  if(Array.isArray(repos)) repos.forEach(r=>{if(r.language) langs[r.language]=(langs[r.language]||0)+1;});
  const posts = parseRSS(rss);
  const evs = Array.isArray(events)?events.filter(e=>e.repo):[];

  console.log('Generating...');
  for(const theme of['dark','light']){
    genHeader(theme, u, stars);
    genBlog(theme, posts);
    genLanguages(theme, langs);
    genActivity(theme, evs);
    console.log(`  ${theme} done`);
  }
  console.log('All OK!');
}

main().catch(e=>{console.error(e);process.exit(1);});
