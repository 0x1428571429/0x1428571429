const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USER = '0x1428571429';

const C = {
  dark: { bg: '#111111', card: '#1a1a1a', text: '#e8e8e8', dim: '#666666', border: '#2a2a2a', accent: '#e8e8e8' },
  light: { bg: '#f7f6f3', card: '#ffffff', text: '#2f3437', dim: '#888888', border: '#e8e8e8', accent: '#2f3437' },
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
    const l = (m[1].match(/<link>(.*?)<\/link>/)||[])[1]||'';
    const d = (m[1].match(/<pubDate>(.*?)<\/pubDate>/)||[])[1]||'';
    r.push({ title: t.replace(/<!\[CDATA\[|\]\]>/g,''), link: l, date: d ? new Date(d).toISOString().slice(0,10) : '' });
  }
  return r.slice(0, 10);
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function tr(s, n) { return s.length <= n ? s : s.slice(0,n-1)+'…'; }
function fmt(n) { return n>=1000?(n/1000).toFixed(1)+'k':String(n); }
function ago(d) {
  const df=Date.now()-d.getTime(), m=Math.floor(df/60000);
  if(m<60) return m+'m ago'; const h=Math.floor(m/60);
  if(h<24) return h+'h ago'; const dd=Math.floor(h/24);
  return dd<30?dd+'d ago':d.toISOString().slice(0,10);
}

function evDesc(e) {
  const r=e.repo?.name||'';
  switch(e.type) {
    case'PushEvent': return 'pushed to '+r;
    case'CreateEvent': return 'created '+(e.payload?.ref_type||'')+' in '+r;
    case'IssuesEvent': return (e.payload?.action||'')+' issue '+r;
    case'IssueCommentEvent': return 'commented on '+r;
    case'PullRequestEvent': return (e.payload?.action||'')+' PR '+r;
    case'PullRequestReviewEvent': return 'reviewed PR '+r;
    case'WatchEvent': return 'starred '+r;
    case'ForkEvent': return 'forked '+r;
    default: return r;
  }
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
function genHeader(theme, u, stars) {
  const name = u.name||u.login;
  const bio = u.bio?tr(u.bio.trim().replace(/\s+/g,' '),55):'';
  const meta = `joined ${new Date(u.created_at).toISOString().slice(0,7)}${u.location?' \u00b7 '+esc(u.location):''}`;
  const stats=[['stars',fmt(stars)],['repos',u.public_repos],['followers',fmt(u.followers)]];
  const h = 180;

  make(`header.${theme}.svg`, theme, h, t => {
    let o = '';
    o += `<text x="${P}" y="30" fill="${t.dim}" font-size="12" font-family="${MONO}">${USER}</text>\n`;
    o += `<text x="${P}" y="62" fill="${t.text}" font-size="28" font-family="${SANS}" font-weight="600">${esc(name)}</text>\n`;
    if(bio) o+= `<text x="${P}" y="88" fill="${t.dim}" font-size="14" font-family="${SANS}">${esc(bio)}</text>\n`;
    o += `<text x="${P}" y="108" fill="${t.dim}" font-size="12" font-family="${MONO}">${meta}</text>\n`;
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
      o+=`<a href="${esc(p.link)}" target="_blank">\n`;
      o+=`  <text x="${P}" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${p.date}</text>\n`;
      o+=`  <text x="${P+150}" y="${by}" fill="${t.text}" font-size="14" font-family="${SANS}">${tr(p.title,65)}</text>\n`;
      o+=`</a>\n`;
    });
    return o;
  });
}

// === LANGUAGES ===
function genLanguages(theme, langs) {
  const sorted=Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!sorted.length) return;
  const total=sorted.reduce((s,[,v])=>s+v,0);
  const h = 56+sorted.length*IH;
  make(`lang.${theme}.svg`, theme, h, t => {
    let o = `<text x="${P}" y="24" fill="${t.text}" font-size="13" font-family="${SANS}" font-weight="600">Languages</text>\n`;
    sorted.forEach(([lang,count],i)=>{
      const by=56+i*IH, pct=total>0?count/total*100:0, bw=Math.max(8,560*pct/100);
      const color=LC[lang]||t.text;
      o+=`<text x="${P}" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${esc(lang)}</text>\n`;
      o+=`<rect x="140" y="${by-6}" width="${bw}" height="10" fill="${color}" rx="5"/>\n`;
      o+=`<text x="720" y="${by}" fill="${t.dim}" font-size="14" font-family="${MONO}">${pct.toFixed(1)}%</text>\n`;
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
  const evs = Array.isArray(events)?events.filter(e=>e.repo && e.type==='WatchEvent'):[];

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
