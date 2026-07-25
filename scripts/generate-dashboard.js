const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USERNAME = '0x1428571429';

const THEMES = {
  dark: {
    bg: '#0d1117', card: '#161b22', text: '#c9d1d9', secondary: '#8b949e',
    accent: '#58a6ff', border: '#30363d',
  },
  light: {
    bg: '#ffffff', card: '#f6f8fa', text: '#24292f', secondary: '#57606a',
    accent: '#0969da', border: '#d0d7de',
  },
};

const FONT = 'Menlo,"Meslo LG","Helvetica Neue",monospace';
const FONT_UI = 'system-ui,-apple-system,sans-serif';

const LOGO = [
  '___________      __    _   __           __',
  '/_  __/ _ |____/ /_  (_) / /_ _____   / /__',
  ' / / / __ / __/ __/ / / / _// -_) | / / _ \\',
  '/_/ /_/ |_\\__/\\__/ /_/  \\__/\\__/|_|_/ .__/',
  '                                   /_/',
];

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
    items.push({
      title: t.replace(/<!\[CDATA\[|\]\]>/g, ''),
      link: l,
      date: d ? new Date(d).toISOString().slice(0, 10) : '',
    });
  }
  return items.slice(0, 8);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trunc(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

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

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
  Vue: '#4fc08d', Python: '#3572A5', Shell: '#89e051', Dockerfile: '#384d54',
  'C++': '#f34b7d', Java: '#b07219', Rust: '#dea584', Go: '#00ADD8',
};

function generateSVG(data, themeName) {
  const t = THEMES[themeName];
  const { user, totalStars, languages, events, blogPosts } = data;

  const W = 920;
  const PAD = 30;
  const CW = W - PAD * 2;

  let y = PAD;
  const out = [];

  // helpers
  const bg = () => `<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  const rect = (x, y, w, h, fill, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || t.card}" rx="${rx || 6}"/>`;
  const txt = (x, y, s, c, sz) => `<text x="${x}" y="${y}" fill="${c || t.text}" font-size="${sz || 13}" font-family="${FONT}">${esc(s)}</text>`;
  const txtUI = (x, y, s, c, sz, fw) => `<text x="${x}" y="${y}" fill="${c || t.text}" font-size="${sz || 13}" font-family="${FONT_UI}"${fw ? ' font-weight="'+fw+'"' : ''}>${esc(s)}</text>`;
  const ln = (x, y, w) => `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${t.border}" stroke-width="1"/>`;
  const link = (href, content) => `<a href="${esc(href)}" target="_blank">${content}</a>`;
  const bar = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w || 0}" height="${h}" fill="${c || t.accent}" rx="${h/2}"/>`;

  let H;
  let totalLines = 0;

  // Estimate total lines for H
  totalLines += 5; // logo
  totalLines += 1; // name
  const blogLines = blogPosts.length || 0;
  totalLines += blogLines;
  const langLines = Math.min(Object.keys(languages).length, 7);
  totalLines += langLines + 4;
  const eventLines = Math.min(events.length, 6);
  totalLines += eventLines + 1;
  H = 400 + totalLines * 32;

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">`);
  out.push(bg());

  // ===== PROFILE HEADER =====
  (() => {
    const cx = PAD;
    const cy = y;
    const ch = 150;
    const ri = 8;
    out.push(rect(cx, cy, CW, ch));

    LOGO.forEach((l, i) => {
      out.push(txt(cx + 16, cy + 22 + i * 18, l, t.accent, 11));
    });

    const name = user.name || user.login;
    const bio = user.bio ? trunc(user.bio, 55) : '';
    out.push(txtUI(cx + 220, cy + 32, name, t.text, 22, 'bold'));
    if (bio) out.push(txtUI(cx + 220, cy + 54, bio, t.secondary, 13));
    const meta = 'joined ' + new Date(user.created_at).toISOString().slice(0, 7);
    out.push(txtUI(cx + 220, cy + 54, '', t.secondary, 12));
    out.push(txtUI(cx + 220, cy + 74, meta + (user.location ? '  ·  ' + esc(user.location) : ''), t.secondary, 12));

    const stats = [
      ['Stars', fmt(totalStars)],
      ['Repos', user.public_repos],
      ['Followers', fmt(user.followers)],
      ['Following', fmt(user.following)],
    ];
    stats.forEach(([label, val], i) => {
      const sx = cx + 220 + i * 105;
      out.push(txtUI(sx, cy + 110, val, t.accent, 18, 'bold'));
      out.push(txtUI(sx, cy + 128, label, t.secondary, 10));
    });

    y += ch + 16;
  })();

  // ===== BLOG POSTS =====
  if (blogPosts.length > 0) {
    const cx = PAD;
    const cy = y;
    const itemH = 28;
    const ch = 52 + blogPosts.length * itemH;
    out.push(rect(cx, cy, CW, ch));
    out.push(txtUI(cx + 16, cy + 24, '📝  Latest Blog Posts', t.accent, 15, 'bold'));
    out.push(ln(cx + 16, cy + 34, CW - 32));

    blogPosts.forEach((post, i) => {
      const by = cy + 52 + i * itemH;
      const title = trunc(post.title, 55);
      out.push(link(post.link,
        txt(cx + 16, by, '·  ' + title, t.text, 12) +
        txt(cx + CW - 110, by, post.date, t.secondary, 10)
      ));
    });

    y += ch + 16;
  }

  // ===== LANGUAGES + STATS =====
  (() => {
    const cx = PAD;
    const cy = y;
    const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const top = sorted.slice(0, 7);
    const itemH = 30;
    const langH = Math.max(top.length * itemH + 16, 140) + 40;
    const statsH = 140;
    const ch = Math.max(langH, statsH) + 50;

    out.push(rect(cx, cy, CW, ch));
    out.push(txtUI(cx + 16, cy + 24, '🈷️  Languages', t.accent, 15, 'bold'));
    out.push(ln(cx + 16, cy + 34, CW - 32));

    const leftW = 370;
    top.forEach(([lang, count], i) => {
      const by = cy + 50 + i * itemH;
      const pct = total > 0 ? (count / total * 100) : 0;
      const color = LANG_COLORS[lang] || t.accent;
      const bw = Math.max(20, 180 * pct / 100);
      out.push(txt(cx + 16, by, lang, t.text, 11));
      out.push(bar(cx + 130, by - 5, bw, 10, color));
      out.push(txt(cx + 320, by, pct.toFixed(1) + '%', t.secondary, 10));
    });

    out.push(txtUI(cx + leftW + 30, cy + 50, '⚡ GitHub Stats', t.text, 14, 'bold'));
    const rightStats = [
      ['Total Stars', fmt(totalStars)],
      ['Public Repos', user.public_repos],
      ['Followers', fmt(user.followers)],
      ['Following', fmt(user.following)],
    ];
    rightStats.forEach(([label, val], i) => {
      const ry = cy + 78 + i * 30;
      out.push(txtUI(cx + leftW + 30, ry, label, t.secondary, 11));
      out.push(txtUI(cx + leftW + 30, ry + 14, val, t.text, 14, 'bold'));
    });

    y += ch + 16;
  })();

  // ===== RECENT ACTIVITY =====
  if (events.length > 0) {
    const cx = PAD;
    const cy = y;
    const itemH = 26;
    const count = Math.min(events.length, 6);
    const ch = 52 + count * itemH;
    out.push(rect(cx, cy, CW, ch));
    out.push(txtUI(cx + 16, cy + 24, '📰  Recent Activity', t.accent, 15, 'bold'));
    out.push(ln(cx + 16, cy + 34, CW - 32));

    events.slice(0, count).forEach((ev, i) => {
      const by = cy + 52 + i * itemH;
      out.push(txt(cx + 16, by, '·  ' + trunc(evDesc(ev), 75), t.text, 11));
      out.push(txt(cx + CW - 70, by, ago(new Date(ev.created_at)), t.secondary, 10));
    });

    y += ch + 16;
  }

  // ===== FOOTER =====
  out.push(txtUI(W / 2, H - 30, '✨ Generated by GitHub Actions · Updated daily ✨', t.secondary, 11));

  out.push('</svg>');
  return out.join('\n');
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
    const svg = generateSVG({ user, totalStars, languages, events: validEvents, blogPosts }, theme);
    fs.writeFileSync(`dashboard.${theme}.svg`, svg);
    console.log(`  -> dashboard.${theme}.svg (${svg.length} bytes)`);
  }
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
