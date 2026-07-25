const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USERNAME = '0x1428571429';

const THEMES = {
  dark: { bg: '#0d1117', card: '#161b22', text: '#c9d1d9', secondary: '#8b949e', accent: '#58a6ff', border: '#30363d' },
  light: { bg: '#ffffff', card: '#f6f8fa', text: '#24292f', secondary: '#57606a', accent: '#0969da', border: '#d0d7de' },
};

const FONT = "Menlo,'Meslo LG','Helvetica Neue',monospace";
const FONT_UI = 'system-ui,-apple-system,sans-serif';
const W = 440;
const P = 16;

const LOGO = [
  '___________      __    _   __           __',
  '/_  __/ _ |____/ /_  (_) / /_ _____   / /__',
  ' / / / __ / __/ __/ / / / _// -_) | / / _ \\',
  '/_/ /_/ |_\\__/\\__/ /_/  \\__/\\__/|_|_/ .__/',
  '                                   /_/',
];

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
  Vue: '#4fc08d', Python: '#3572A5', Shell: '#89e051', Dockerfile: '#384d54',
  'C++': '#f34b7d', Java: '#b07219',
};

function fetchJSON(url) {
  const opts = { headers: { 'User-Agent': 'dashboard' } };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  return new Promise((resolve, reject) => {
    https.get(url, opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dashboard' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const t = (m[1].match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const l = (m[1].match(/<link>(.*?)<\/link>/) || [])[1] || '';
    const d = (m[1].match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    items.push({ title: t.replace(/<!\[CDATA\[|\]\]>/g, ''), link: l, date: d ? new Date(d).toISOString().slice(0, 10) : '' });
  }
  return items.slice(0, 8);
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function trunc(s, n) { return s.length <= n ? s : s.slice(0, n - 1) + '…'; }
function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
function ago(d) {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const day = Math.floor(h / 24);
  if (day < 30) return day + 'd';
  return d.toISOString().slice(0, 10);
}

function evDesc(e) {
  const r = e.repo?.name || '';
  switch (e.type) {
    case 'PushEvent': return 'Push  ' + r;
    case 'CreateEvent': return 'Create ' + (e.payload?.ref_type || '') + '  ' + r;
    case 'IssuesEvent': return (e.payload?.action || '') + ' issue  ' + r;
    case 'IssueCommentEvent': return 'Comment  ' + r;
    case 'PullRequestEvent': return 'PR ' + (e.payload?.action || '') + '  ' + r;
    case 'PullRequestReviewEvent': return 'Review  ' + r;
    case 'WatchEvent': return 'Star  ' + r;
    case 'ForkEvent': return 'Fork  ' + r;
    case 'ReleaseEvent': return 'Release  ' + r;
    default: return e.type + '  ' + r;
  }
}

function render(theme, name, w, h, draw) {
  const t = THEMES[theme];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">\n`;
  svg += `<rect width="${w}" height="${h}" fill="${t.bg}" rx="6"/>\n`;
  svg += draw(t);
  svg += '</svg>';
  fs.writeFileSync(name, svg);
}

// ===== PROFILE HEADER =====
function genHeader(theme, user, totalStars) {
  render(theme, `header.${theme}.svg`, W, 172, t => {
    let out = '';
    LOGO.forEach((l, i) => out += `  <text x="${P}" y="${20 + i * 18}" fill="${t.accent}" font-size="11" font-family="${FONT}">${esc(l)}</text>\n`);

    const name = user.name || user.login;
    const bio = user.bio ? trunc(user.bio.trim().replace(/\s+/g, ' '), 50) : '';
    out += `  <text x="${P}" y="${116}" fill="${t.text}" font-size="18" font-family="${FONT_UI}" font-weight="bold">${esc(name)}</text>\n`;
    if (bio) out += `  <text x="${P}" y="${136}" fill="${t.secondary}" font-size="12" font-family="${FONT_UI}">${esc(bio)}</text>\n`;

    const joined = 'joined ' + new Date(user.created_at).toISOString().slice(0, 7);
    out += `  <text x="${P}" y="${152}" fill="${t.secondary}" font-size="10" font-family="${FONT_UI}">${esc(joined)}${user.location ? ' · ' + esc(user.location) : ''}</text>\n`;

    const stats = [
      ['⭐', fmt(totalStars)],
      ['📦', user.public_repos],
      ['👥', fmt(user.followers)],
    ];
    const sw = (W - P * 2) / stats.length;
    stats.forEach(([icon, val], i) => {
      const sx = P + i * sw + sw / 2;
      out += `  <text x="${sx}" y="${128}" fill="${t.text}" font-size="13" font-family="${FONT_UI}" font-weight="bold" text-anchor="middle">${icon} ${val}</text>\n`;
    });
    return out;
  });
}

// ===== BLOG POSTS =====
function genBlog(theme, posts) {
  if (!posts.length) return;
  const itemH = 26;
  const h = 46 + posts.length * itemH;
  render(theme, `blog.${theme}.svg`, W, h, t => {
    let out = `  <text x="${P}" y="${22}" fill="${t.accent}" font-size="13" font-family="${FONT_UI}" font-weight="bold">📝  Latest Blog Posts</text>\n`;
    out += `  <line x1="${P}" y1="${30}" x2="${W - P}" y2="${30}" stroke="${t.border}" stroke-width="1"/>\n`;
    posts.forEach((post, i) => {
      const by = 46 + i * itemH;
      const title = trunc(post.title, 40);
      out += `  <a href="${esc(post.link)}" target="_blank">\n`;
      out += `    <text x="${P}" y="${by}" fill="${t.text}" font-size="11" font-family="${FONT}">·  ${esc(title)}</text>\n`;
      out += `    <text x="${W - P}" y="${by}" fill="${t.secondary}" font-size="9" font-family="${FONT}" text-anchor="end">${post.date}</text>\n`;
      out += `  </a>\n`;
    });
    return out;
  });
}

// ===== LANGUAGES =====
function genLanguages(theme, languages) {
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const top = sorted.slice(0, 7);
  if (!top.length) return;
  const itemH = 26;
  const h = 46 + top.length * itemH;
  render(theme, `languages.${theme}.svg`, W, h, t => {
    let out = `  <text x="${P}" y="${22}" fill="${t.accent}" font-size="13" font-family="${FONT_UI}" font-weight="bold">🈷️  Languages</text>\n`;
    out += `  <line x1="${P}" y1="${30}" x2="${W - P}" y2="${30}" stroke="${t.border}" stroke-width="1"/>\n`;
    top.forEach(([lang, count], i) => {
      const by = 46 + i * itemH;
      const pct = total > 0 ? (count / total * 100) : 0;
      const color = LANG_COLORS[lang] || t.accent;
      const bw = Math.max(10, 170 * pct / 100);
      out += `  <text x="${P}" y="${by}" fill="${t.text}" font-size="10" font-family="${FONT}">${esc(lang)}</text>\n`;
      out += `  <rect x="110" y="${by - 5}" width="${bw}" height="9" fill="${color}" rx="4.5"/>\n`;
      out += `  <text x="300" y="${by}" fill="${t.secondary}" font-size="10" font-family="${FONT}">${pct.toFixed(1)}%</text>\n`;
    });
    return out;
  });
}

// ===== RECENT ACTIVITY =====
function genActivity(theme, events) {
  if (!events.length) return;
  const count = Math.min(events.length, 6);
  const itemH = 24;
  const h = 46 + count * itemH;
  render(theme, `activity.${theme}.svg`, W, h, t => {
    let out = `  <text x="${P}" y="${22}" fill="${t.accent}" font-size="13" font-family="${FONT_UI}" font-weight="bold">📰  Recent Activity</text>\n`;
    out += `  <line x1="${P}" y1="${30}" x2="${W - P}" y2="${30}" stroke="${t.border}" stroke-width="1"/>\n`;
    events.slice(0, count).forEach((ev, i) => {
      const by = 46 + i * itemH;
      out += `  <text x="${P}" y="${by}" fill="${t.text}" font-size="10" font-family="${FONT}">·  ${esc(trunc(evDesc(ev), 50))}</text>\n`;
      out += `  <text x="${W - P}" y="${by}" fill="${t.secondary}" font-size="9" font-family="${FONT}" text-anchor="end">${ago(new Date(ev.created_at))}</text>\n`;
    });
    return out;
  });
}

async function main() {
  console.log('Fetching...');
  const [user, repos, events, rssXml] = await Promise.all([
    fetchJSON(`https://api.github.com/users/${USERNAME}`),
    fetchJSON(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`),
    fetchJSON(`https://api.github.com/users/${USERNAME}/events?per_page=10`),
    fetchText('https://time-friend.com/en/index.xml').catch(() => ''),
  ]);

  console.log('Processing...');
  const totalStars = Array.isArray(repos) ? repos.reduce((s, r) => s + (r.stargazers_count || 0), 0) : 0;
  const languages = {};
  if (Array.isArray(repos)) repos.forEach(r => { if (r.language) languages[r.language] = (languages[r.language] || 0) + 1; });
  const blogPosts = parseRSS(rssXml);
  const validEvents = Array.isArray(events) ? events.filter(e => e.repo) : [];

  console.log('Generating...');
  for (const theme of ['dark', 'light']) {
    genHeader(theme, user, totalStars);
    genBlog(theme, blogPosts);
    genLanguages(theme, languages);
    genActivity(theme, validEvents);
  }

  console.log('All SVGs generated!');
  console.log('  header.{dark,light}.svg');
  console.log('  blog.{dark,light}.svg');
  console.log('  languages.{dark,light}.svg');
  console.log('  activity.{dark,light}.svg');
}

main().catch(e => { console.error(e); process.exit(1); });
