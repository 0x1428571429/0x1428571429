const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USER = '0x1428571429';

const C = {
  dark: { bg: '#1a1b2f', card: '#252641', text: '#e4e4f0', dim: '#9899b9', accent: '#ff7eb3', border: '#38395a', green: '#7bed9f' },
  light: { bg: '#fef6f0', card: '#fff5eb', text: '#2d2d44', dim: '#8a8aa8', accent: '#ff6b9d', border: '#ffe0cc', green: '#2ed573' },
};

const MONO = "Menlo,'Meslo LG','Helvetica Neue',monospace";
const UI = 'system-ui,-apple-system,sans-serif';
const W = 620;
const P = 16;

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
    case'PushEvent': return 'Pushed to ' + r;
    case'CreateEvent': return 'Created '+(e.payload?.ref_type||'')+' in '+r;
    case'IssuesEvent': return (e.payload?.action||'')+' issue in '+r;
    case'IssueCommentEvent': return 'Commented on issue in '+r;
    case'PullRequestEvent': return (e.payload?.action||'')+' PR in '+r;
    case'PullRequestReviewEvent': return 'Reviewed PR in '+r;
    case'WatchEvent': return 'Starred '+r;
    case'ForkEvent': return 'Forked '+r;
    default: return r;
  }
}

function make(name, theme, h, draw) {
  const t = C[theme];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" fill="none">\n`;
  svg += `<rect width="${W}" height="${h}" fill="${t.bg}" rx="14"/>\n`;
  svg += draw(t);
  svg += '</svg>';
  fs.writeFileSync(name, svg);
}

// === HEADER ===
function genHeader(theme, u, stars) {
  make(`header.${theme}.svg`, theme, 180, t => {
    let o = `<text x="${W/2}" y="38" fill="${t.accent}" font-size="13" font-family="${MONO}" text-anchor="middle">0x1428571429</text>\n`;
    const name = u.name||u.login;
    o += `<text x="${W/2}" y="64" fill="${t.text}" font-size="20" font-family="${UI}" font-weight="bold" text-anchor="middle">${esc(name)}</text>\n`;
    const bio = u.bio?tr(u.bio.trim().replace(/\s+/g,' '),45):'';
    if(bio) o += `<text x="${W/2}" y="86" fill="${t.dim}" font-size="12" font-family="${UI}" text-anchor="middle">${esc(bio)}</text>\n`;
    o += `<text x="${W/2}" y="106" fill="${t.dim}" font-size="10" font-family="${UI}" text-anchor="middle">joined ${new Date(u.created_at).toISOString().slice(0,7)}${u.location?' · '+esc(u.location):''}</text>\n`;

    const stats=[['🌟','Stars',fmt(stars)],['📦','Repos',u.public_repos],['👥','Followers',fmt(u.followers)]];
    const sw=(W-80)/stats.length;
    stats.forEach(([e,l,v],i)=>{
      const sx=40+i*sw+sw/2;
      o+=`<text x="${sx}" y="140" fill="${t.text}" font-size="16" font-family="${UI}" font-weight="bold" text-anchor="middle">${e} ${v}</text>\n`;
      o+=`<text x="${sx}" y="156" fill="${t.dim}" font-size="9" font-family="${UI}" text-anchor="middle">${l}</text>\n`;
    });
    return o;
  });
}

// === BLOG ===
function genBlog(theme, posts) {
  if(!posts.length) return;
  const ih=30, h=50+posts.length*ih;
  make(`blog.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${UI}" font-weight="bold">📝 Latest Blog Posts</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border}" stroke-width="1" stroke-dasharray="4,4"/>\n`;
    posts.forEach((p,i)=>{
      const by=50+i*ih;
      o+=`<a href="${esc(p.link)}" target="_blank">\n`;
      o+=`  <text x="${P+4}" y="${by}" fill="${t.text}" font-size="12" font-family="${MONO}">▸ ${tr(p.title,47)}</text>\n`;
      o+=`  <text x="${W-P}" y="${by}" fill="${t.dim}" font-size="9" font-family="${MONO}" text-anchor="end">${p.date}</text>\n`;
      o+=`</a>\n`;
    });
    return o;
  });
}

// === LANGUAGES ===
function genLanguages(theme, langs) {
  const sorted=Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!sorted.length) return;
  const total=sorted.reduce((s,[,v])=>s+v,0), ih=28, h=50+sorted.length*ih;
  const lc={JavaScript:'#f1e05a',TypeScript:'#3178c6',HTML:'#e34c26',CSS:'#563d7c',Vue:'#4fc08d',Python:'#3572A5',Shell:'#89e051','C++':'#f34b7d'};
  make(`lang.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${UI}" font-weight="bold">🈷️ Languages</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border}" stroke-width="1" stroke-dasharray="4,4"/>\n`;
    sorted.forEach(([lang,count],i)=>{
      const by=50+i*ih;
      const pct=total>0?count/total*100:0;
      const color=lc[lang]||t.accent;
      const bw=Math.max(10,280*pct/100);
      o+=`<text x="${P+4}" y="${by}" fill="${t.text}" font-size="11" font-family="${MONO}">${esc(lang)}</text>\n`;
      o+=`<rect x="130" y="${by-6}" width="${bw}" height="11" fill="${color}" rx="5.5"/>\n`;
      o+=`<text x="430" y="${by}" fill="${t.dim}" font-size="10" font-family="${MONO}">${pct.toFixed(1)}%</text>\n`;
    });
    return o;
  });
}

// === ACTIVITY ===
function genActivity(theme, events) {
  if(!events.length) return;
  const n=Math.min(events.length,5), ih=26, h=50+n*ih;
  make(`activity.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.accent}" font-size="14" font-family="${UI}" font-weight="bold">📰 Recent Activity</text>\n`;
    o += `<line x1="${P}" y1="34" x2="${W-P}" y2="34" stroke="${t.border}" stroke-width="1" stroke-dasharray="4,4"/>\n`;
    events.slice(0,n).forEach((ev,i)=>{
      const by=50+i*ih;
      o+=`<text x="${P+4}" y="${by}" fill="${t.text}" font-size="11" font-family="${MONO}">▸ ${tr(evDesc(ev),55)}</text>\n`;
      o+=`<text x="${W-P}" y="${by}" fill="${t.dim}" font-size="9" font-family="${MONO}" text-anchor="end">${ago(new Date(ev.created_at))}</text>\n`;
    });
    return o;
  });
}

// === MAIN ===
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
