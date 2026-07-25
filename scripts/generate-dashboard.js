const fs = require('fs');
const https = require('https');

const TOKEN = process.env.METRICS_TOKEN || '';
const USERNAME = '0x1428571429';

const THEMES = {
  dark: {
    bg: '#0d1117', card: '#161b22', text: '#c9d1d9', secondary: '#8b949e',
    accent: '#58a6ff', border: '#30363d', green: '#3fb950', orange: '#d29922',
  },
  light: {
    bg: '#ffffff', card: '#f6f8fa', text: '#24292f', secondary: '#57606a',
    accent: '#0969da', border: '#d0d7de', green: '#1a7f37', orange: '#9a6700',
  },
};

const FONT = 'Menlo,"Meslo LG","Helvetica Neue",monospace';
const FONT_UI = 'system-ui,-apple-system,sans-serif';
const LOGO = `___________      __    _   __           __
/_  __/ _ |____/ /_  (_) / /_ _____   / /__
 / / / __ / __/ __/ / / / _// -_) | / / _ \\
/_/ /_/ |_\\__/\\__/ /_/  \\__/\\__/|_|_/ .__/
                                   /_/`;

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
    case 'PushEvent': return `Push  ${r}`;
    case 'CreateEvent': return `Create ${e.payload?.ref_type || ''}  ${r}`;
    case 'IssuesEvent': return `${e.payload?.action || ''} issue  ${r}`;
    case 'IssueCommentEvent': return `Comment  ${r}`;
    case 'PullRequestEvent': return `PR ${e.payload?.action || ''}  ${r}`;
    case 'PullRequestReviewEvent': return `Review  ${r}`;
    case 'WatchEvent': return `Star  ${r}`;
    case 'ForkEvent': return `Fork  ${r}`;
    case 'ReleaseEvent': return `Release  ${r}`;
    default: return `${e.type}  ${r}`;
  }
}

function generateSVG(data, themeName) {
  const t = THEMES[themeName];
  const { user, totalStars, languages, events, blogPosts } = data;

  const W = 920;
  const H = 1550;
  const P = 30;
  const cardW = W - P * 2;
  let y = 0;
  const parts = [];

  const bg = () => `<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  const fill = (x, y, w, h, c, rx) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c || t.card}" rx="${rx || 6}"/>`;
  const txt = (x, y, s, c, sz, fw) =>
    `<text x="${x}" y="${y}" fill="${c || t.text}" font-size="${sz || 13}" font-family="${FONT}"${fw ? ' font-weight="'+fw+'"' : ''}>${esc(s)}</text>`;
  const txtUI = (x, y, s, c, sz, fw) =>
    `<text x="${x}" y="${y}" fill="${c || t.text}" font-size="${sz || 13}" font-family="${FONT_UI}"${fw ? ' font-weight="'+fw+'"' : ''}>${esc(s)}</text>`;
  const line = (x, y, w, c) =>
    `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${c || t.border}" stroke-width="1"/>`;
  const a = (href, content) => `<a href="${esc(href)}" target="_blank">${content}</a>`;
  const bar = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c || t.accent}" rx="${h/2}"/>`;



  function card(title, content, h) {
    const cy = y;
    let html = fill(P, cy, cardW, h);
    if (title) {
      html += txtUI(P + 16, cy + 24, title, t.accent, 15, 'bold');
      html += line(P + 16, cy + 34, cardW - 32);
    }
    html += content;
    y += h + 14;
    return html;
  }

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">`);
  parts.push(bg());

  // ==================== PROFILE HEADER ====================
  (() => {
    const cy = P;
    const ch = 150;
    parts.push(fill(P, cy, cardW, ch));

    const asciiLines = LOGO.split('\n');
    asciiLines.forEach((l, i) => {
      parts.push(txt(P + 16, cy + 22 + i * 18, l, t.accent, 11));
    });

    const name = user.name || user.login;
    const bio = user.bio ? trunc(user.bio, 55) : '';
    parts.push(txtUI(220, cy + 32, name, t.text, 22, 'bold'));
    if (bio) parts.push(txtUI(220, cy + 54, bio, t.secondary, 13));
    const joined = `joined ${new Date(user.created_at).toISOString().slice(0, 7)}`;
    if (user.location) parts.push(txtUI(220, cy + 54, '', t.secondary, 12));
    parts.push(txtUI(220, cy + 74, joined + (user.location ? `  ·  ${esc(user.location)}` : ''), t.secondary, 12));

    const stats = [
      ['Stars', fmt(totalStars)],
      ['Repos', user.public_repos],
      ['Followers', fmt(user.followers)],
      ['Following', fmt(user.following)],
    ];
    const statX = 220;
    stats.forEach(([label, val], i) => {
      const sx = statX + i * 105;
      parts.push(txtUI(sx, cy + 110, val, t.accent, 18, 'bold'));
      parts.push(txtUI(sx, cy + 128, label, t.secondary, 10));
    });

    y = cy + ch + 14;
  })();

  // ==================== BLOG POSTS ====================
  if (blogPosts.length > 0) {
    let content = '';
    blogPosts.forEach((post, i) => {
      const by = 50 + i * 30;
      const title = trunc(post.title, 55);
      content += a(post.link,
        txt(P + 16, by, '·  ' + title, t.text, 12) +
        txt(P + cardW - 110, by, post.date, t.secondary, 10)
      );
    });
    const h = 50 + blogPosts.length * 30;
    parts.push(card('📝  Latest Blog Posts', content, h));
  }

  // ==================== LANGUAGES + STATS ====================
  (() => {
    const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const top = sorted.slice(0, 7);

    let left = '';
    const langColors = {
      JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#563d7c',
      Vue: '#4fc08d', Python: '#3572A5', Shell: '#89e051', Dockerfile: '#384d54',
    };

    top.forEach(([lang, count], i) => {
      const pct = total > 0 ? (count / total * 100) : 0;
      const by = 50 + i * 32;
      const color = langColors[lang] || t.accent;
      left += txt(P + 16, by, lang, t.text, 11);
      left += bar(P + 150, by - 5, Math.max(20, 180 * pct / 100), 10, color);
      left += txt(P + 340, by, pct.toFixed(1) + '%', t.secondary, 10);
    });
    const h = Math.max(top.length * 32 + 24, 160) + 34;

    let right = '';
    right += txtUI(cardW / 2 + P + 10, 50, '⚡ GitHub Stats', t.text, 14, 'bold');
    const rightStats = [
      ['Total Stars', fmt(totalStars)],
      ['Public Repos', user.public_repos],
      ['Followers', fmt(user.followers)],
      ['Following', fmt(user.following)],
    ];
    rightStats.forEach(([label, val], i) => {
      const ry = 80 + i * 30;
      right += txtUI(cardW / 2 + P + 10, ry, label, t.secondary, 11);
      right += txtUI(cardW / 2 + P + 10, ry + 14, val, t.text, 14, 'bold');
    });

    const bigH = Math.max(h, 80 + rightStats.length * 30 + 24) + 16;
    parts.push(card('🈷️  Languages', left + right, bigH));
  })();

  // ==================== RECENT ACTIVITY ====================
  if (events.length > 0) {
    let content = '';
    events.slice(0, 6).forEach((ev, i) => {
      const ay = 50 + i * 28;
      content += txt(P + 16, ay, '·  ' + trunc(evDesc(ev), 75), t.text, 11);
      content += txt(P + cardW - 80, ay, ago(new Date(ev.created_at)), t.secondary, 10);
    });
    const h = 50 + Math.min(events.length, 6) * 28;
    parts.push(card('📰  Recent Activity', content, h));
  }

  // ==================== FOOTER ====================
  (() => {
    const fy = H - 50;
    parts.push(txtUI(W / 2, fy, '✨ Generated by GitHub Actions · Updated daily ✨', t.secondary, 11));
  })();

  parts.push('</svg>');
  return parts.join('\n');
}

async function main() {
  console.log('Fetching data...');
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

  console.log('Generating SVGs...');
  for (const theme of ['dark', 'light']) {
    const svg = generateSVG({ user, totalStars, languages, events: validEvents, blogPosts }, theme);
    fs.writeFileSync(`dashboard.${theme}.svg`, svg);
    console.log(`  -> dashboard.${theme}.svg`);
  }
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
